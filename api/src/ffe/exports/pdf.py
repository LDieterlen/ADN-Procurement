"""Jinja2 + WeasyPrint (ADR-0010): templates render DTO dictionaries only; no database access here."""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML  # pyright: ignore[reportMissingTypeStubs]

TEMPLATES = Path(__file__).resolve().parent / "templates"
_env = Environment(
    loader=FileSystemLoader(TEMPLATES), autoescape=select_autoescape(["html"]), trim_blocks=True
)


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
