"""Jinja2 + WeasyPrint (ADR-0010): templates render DTO dictionaries only; no database access here."""

import base64
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from PIL import Image, ImageOps, UnidentifiedImageError
from weasyprint import HTML  # pyright: ignore[reportMissingTypeStubs]

TEMPLATES = Path(__file__).resolve().parent / "templates"
# Fonts (Newsreader, IBM Plex Sans, IBM Plex Mono — SIL Open Font License, from the Google
# Fonts repository) and the logo, reached by absolute file URL: no network at render time.
ASSETS = Path(__file__).resolve().parent / "assets"
_env = Environment(
    loader=FileSystemLoader(TEMPLATES), autoescape=select_autoescape(["html"]), trim_blocks=True
)
_env.globals["assets_url"] = ASSETS.as_uri()  # pyright: ignore[reportUnknownMemberType]


def cents_text(cents: int | None) -> str:
    """12345 → « 123,45 » (French thousands and decimal separators, two decimals)."""
    if cents is None:
        return ""
    sign = "-" if cents < 0 else ""
    whole, frac = divmod(abs(cents), 100)
    return f"{sign}{whole:,}".replace(",", " ") + f",{frac:02d}"


def milli_text(milli: int) -> str:
    whole, frac = divmod(milli, 1000)
    text = f"{whole:,}".replace(",", " ")
    return text if frac == 0 else f"{text},{frac:03d}".rstrip("0")


def render_html(template: str, context: dict[str, Any]) -> str:
    return _env.get_template(template).render(**context)


def render_pdf(html: str, base_dir: Path) -> bytes:
    """`base_dir` resolves relative image paths (`files/<sha>.<ext>`) without any network access."""
    pdf: bytes | None = _document(html, base_dir).write_pdf()  # pyright: ignore[reportUnknownMemberType]
    assert pdf is not None
    return pdf


def count_pages(html: str, base_dir: Path) -> int:
    """Pages of the rendered document (tests: no PDF parser needed)."""
    return len(_document(html, base_dir).pages)  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]


def _document(html: str, base_dir: Path) -> Any:
    return HTML(string=html, base_url=str(base_dir) + "/").render()  # pyright: ignore[reportUnknownMemberType]


# The sheet's image band (spec « Fiche 1b » v2): fixed boxes, aligned on the margins whatever the
# images (706 × 330 px, gap 10, columns 3fr | 2fr, two rows on the right for three images).
BAND_BOXES: dict[int, list[tuple[int, int, int, int]]] = {
    1: [(0, 0, 706, 330)],
    2: [(0, 0, 418, 330), (428, 0, 278, 330)],
    3: [(0, 0, 418, 330), (428, 0, 278, 160), (428, 170, 278, 160)],
}
MAX_CROP = 0.15  # a studio photo fills its box when at most 15 % of it is cut off
MAX_SCENE_CROP = 0.40  # a picture with busy edges (a room, a material) may lose up to 40 %
NEUTRAL = (239, 235, 229)  # behind a busy picture too far from its box's shape
WHITE = (255, 255, 255)  # behind a plan whose edges are not plain
PRINT_SCALE = 2  # padded images are drawn at 2 px per CSS px (192 dpi on paper)


@dataclass(frozen=True)
class ImageTraits:
    ratio: float  # width / height as displayed (EXIF rotation applied)
    plain_sides: bool  # left and right edges are a plain backdrop (studio shot)
    plain_ends: bool  # same for the top and bottom edges


def _is_plain(pixels: list[tuple[int, int, int]]) -> bool:
    """Edge pixels close to their mean colour: a backdrop, not a busy picture."""
    mean = [sum(p[c] for p in pixels) / len(pixels) for c in range(3)]
    return sum(abs(p[c] - mean[c]) for p in pixels for c in range(3)) / (3 * len(pixels)) <= 12


def _upright(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def image_traits(path: Path) -> ImageTraits:
    """Proportions and edge kinds of an image file; unreadable = a square with busy edges."""
    try:
        image = _upright(path)
    except OSError, UnidentifiedImageError, ValueError:
        return ImageTraits(1.0, False, False)
    small = image.resize((32, 32))  # pyright: ignore[reportUnknownMemberType]

    def pixel(x: int, y: int) -> tuple[int, int, int]:
        value = small.getpixel((x, y))
        return value if isinstance(value, tuple) else (0, 0, 0)  # pyright: ignore[reportReturnType]

    sides = _is_plain([pixel(x, y) for x in (0, 1, 30, 31) for y in range(32)])
    ends = _is_plain([pixel(x, y) for y in (0, 1, 30, 31) for x in range(32)])
    return ImageTraits(image.width / image.height, sides, ends)


def band_layout(images: list[tuple[ImageTraits, str]]) -> list[dict[str, Any]]:
    """Box and treatment of 1 to 3 images `(traits, kind)` (kind: image · finish · drawing):
    - `cover`: fills the box, edges cut — a finish always (a material loses nothing), a studio
      photo when ≤ 15 % is cut, a busy picture (a room) when ≤ 40 % is cut;
    - `extend`: whole, its plain backdrop stretched to the box (seamless, shading kept) — a studio
      photo or a plan on a plain backdrop;
    - `fill`: whole on a flat colour — white behind a busy plan, a neutral tint behind a busy
      picture too far from its box's shape."""
    layout: list[dict[str, Any]] = []
    for (traits, kind), box in zip(images, BAND_BOXES[len(images)], strict=True):
        box_ratio = box[2] / box[3]
        cut = 1 - min(traits.ratio / box_ratio, box_ratio / traits.ratio)
        plain = traits.plain_sides if traits.ratio < box_ratio else traits.plain_ends
        if kind == "finish" or (kind == "image" and cut <= (MAX_CROP if plain else MAX_SCENE_CROP)):
            treatment: dict[str, Any] = {"mode": "cover"}
        elif plain:
            treatment = {"mode": "extend"}
        else:
            treatment = {"mode": "fill", "color": WHITE if kind == "drawing" else NEUTRAL}
        layout.append({"box": box, **treatment})
    return layout


def padded_image(
    path: Path, size: tuple[int, int], color: tuple[int, int, int] | None
) -> str | None:
    """The whole image fitted in `size` (CSS px), the free space filled with its own edges
    stretched outwards (`color` None) or a flat colour; a JPEG data URI, None if unreadable."""
    try:
        image = _upright(path)
    except OSError, UnidentifiedImageError, ValueError:
        return None
    width, height = size[0] * PRINT_SCALE, size[1] * PRINT_SCALE
    fitted = ImageOps.contain(image, (width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (width, height), color or WHITE)
    x, y = (width - fitted.width) // 2, (height - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    if color is None and x > 0:  # pillarbox: stretch the outer columns sideways
        left = fitted.crop((0, 0, 3, fitted.height)).resize((x, fitted.height))  # pyright: ignore[reportUnknownMemberType]
        right_width = width - x - fitted.width
        right = fitted.crop((fitted.width - 3, 0, fitted.width, fitted.height)).resize(  # pyright: ignore[reportUnknownMemberType]
            (right_width, fitted.height)
        )
        canvas.paste(left, (0, y))
        canvas.paste(right, (x + fitted.width, y))
    if color is None and y > 0:  # letterbox: stretch the outer rows up and down
        top = fitted.crop((0, 0, fitted.width, 3)).resize((fitted.width, y))  # pyright: ignore[reportUnknownMemberType]
        bottom_height = height - y - fitted.height
        bottom = fitted.crop((0, fitted.height - 3, fitted.width, fitted.height)).resize(  # pyright: ignore[reportUnknownMemberType]
            (fitted.width, bottom_height)
        )
        canvas.paste(top, (x, 0))
        canvas.paste(bottom, (x, y + fitted.height))
    buffer = BytesIO()
    canvas.save(buffer, "JPEG", quality=88)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()
