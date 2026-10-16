"""Installation pages (ADR-0024): for each sheet, A3 landscape pages with the plan (turned as
asked) and at most `per_page` article cells (photo, code, name) placed by its arrangement, empty
cells kept."""

import base64
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.exports.pdf import milli_text, render_html, render_pdf, upright
from ffe.exports.prescription import document_header
from ffe.i18n import fr
from ffe.installation import END, INK, SIDE, WIDTH, Layout, layout, turn
from ffe.models import File, InstallationPlan, InstallationSheet, Location
from ffe.services.installation_sheet import articles

TEXT_HEIGHT = 62  # code, name and quantity under each photo
PLAN_MARGIN = 6  # round the plan box (installation.html: .plan margin)
PLAN_INSET = PLAN_MARGIN + 1 + 10  # margin, border and padding round the plan
DOT = 14  # px, the numbered dots on the plan (about 4 mm on A3: legible, the plan stays visible)


def _image_size(path: Path, rotation: int) -> tuple[int, int] | None:
    """Width and height of the plan as drawn (EXIF rotation, then a quarter turn swaps them);
    None if unreadable."""
    try:
        with Image.open(path) as image:
            width, height = ImageOps.exif_transpose(image).size
    except OSError, UnidentifiedImageError, ValueError, Image.DecompressionBombError:
        return None
    return (height, width) if rotation in (90, 270) else (width, height)


def _plan_box(rows: list[list[dict[str, Any]]]) -> tuple[int, int]:
    """Inner width and height of the plan's box on the page."""
    cell = next(c for line in rows for c in line if c["kind"] == "plan")
    return cell["w"] - 2 * PLAN_INSET, cell["h"] - 2 * PLAN_INSET


def _fitted(box: tuple[int, int], size: tuple[int, int]) -> dict[str, int]:
    """The plan contained in its box, centred: its rectangle in px inside the box."""
    scale = min(box[0] / size[0], box[1] / size[1])
    width, height = round(size[0] * scale), round(size[1] * scale)
    return {"left": (box[0] - width) // 2, "top": (box[1] - height) // 2, "w": width, "h": height}


def _dots(
    cards: list[dict[str, Any] | None], rect: dict[str, int], rotation: int
) -> list[dict[str, Any]]:
    """The numbered dots of a page's articles, placed on the plan as drawn."""
    dots: list[dict[str, Any]] = []
    for card in cards:
        if card is None:
            continue
        markers: list[tuple[int, int]] = card["markers"]
        for x, y in markers:
            u, v = turn(x, y, rotation)
            dots.append(
                {
                    "number": card["number"],
                    "color": card["color"],
                    "left": rect["left"] + rect["w"] * u // 1000 - DOT // 2,
                    "top": rect["top"] + rect["h"] * v // 1000 - DOT // 2,
                }
            )
    return dots


def _rows(grid: Layout, cards: list[dict[str, Any] | None]) -> list[list[dict[str, Any]]]:
    """The grid row by row: an article cell (a card, or nothing for an empty or unused cell), the
    plan (once, spanning its block), nothing under the plan's span."""
    plan_row, plan_col, plan_rows, plan_cols = grid.plan
    slot_of = {slot: i for i, slot in enumerate(grid.slots)}
    lines: list[list[dict[str, Any]]] = []
    for r, h in enumerate(grid.row_heights):
        line: list[dict[str, Any]] = []
        for c, w in enumerate(grid.col_widths):
            if (r, c) == (plan_row, plan_col):
                height = sum(grid.row_heights[plan_row : plan_row + plan_rows])
                width = sum(grid.col_widths[plan_col : plan_col + plan_cols])
                line.append(
                    {
                        "kind": "plan",
                        "rowspan": plan_rows,
                        "colspan": plan_cols,
                        "h": height,
                        "w": width,
                        "box_h": height - 2 * PLAN_MARGIN,  # the framed box
                        "drawing_h": height - 2 * PLAN_INSET,  # the plan inside it
                    }
                )
            elif (r, c) in slot_of:
                i = slot_of[(r, c)]
                card = cards[i] if i < len(cards) else None
                if card is None:
                    line.append({"kind": "empty", "h": h})
                    continue
                card_h = min(h, END) - 12  # a tall cell: the card centred
                line.append(
                    {
                        "kind": "card",
                        "a": card,
                        "h": h,
                        "card_w": min(w, SIDE) - 12,  # a wide cell: the card centred
                        "card_h": card_h,
                        "top": (h - 12 - card_h) // 2,
                        "photo_h": card_h - TEXT_HEIGHT,
                    }
                )
        lines.append(line)
    return lines


def _rotated(path: Path, degrees: int) -> str | None:
    """The plan turned clockwise, as a JPEG data URI (the stored file never changes)."""
    try:
        with Image.open(path) as image:
            turned = upright(image).rotate(-degrees, expand=True)
    except OSError, UnidentifiedImageError, ValueError, Image.DecompressionBombError:
        return None
    buffer = BytesIO()
    turned.save(buffer, "JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def _pages(session: Session, files_dir: Path, sheet: InstallationSheet) -> list[dict[str, Any]]:
    location = session.get(Location, sheet.location_id)
    assert location is not None
    plan_src: str | None = None
    plan_size: tuple[int, int] | None = None
    if sheet.plan_id is not None:
        plan = session.get(InstallationPlan, sheet.plan_id)
        drawn = session.get(File, plan.file_id) if plan else None
        plan_src = drawn.filename if drawn else None
        plan_size = _image_size(files_dir / drawn.filename, sheet.plan_rotation) if drawn else None
        if drawn and sheet.plan_rotation:
            plan_src = _rotated(files_dir / drawn.filename, sheet.plan_rotation) or plan_src
    items, _candidates = articles(session, sheet)
    photo_ids = [a.photo_file_id for a in items if a and a.photo_file_id]
    files = {f.id: f.filename for f in session.scalars(select(File).where(File.id.in_(photo_ids)))}
    cards: list[dict[str, Any] | None] = [
        {
            "code": a.code,
            "name": a.name,
            "type": a.type_name,
            "qty_text": milli_text(a.qty_milli),
            "photo": files.get(a.photo_file_id) if a.photo_file_id else None,
            "number": position % sheet.per_page + 1,  # its cell on the page, the dots' number
            "color": a.color if sheet.color_by_type else INK,
            "markers": [(m.x, m.y) for m in a.markers],
        }
        if a
        else None
        for position, a in enumerate(items)
    ]
    grid = layout(sheet.arrangement, sheet.per_page)
    chunks = [cards[i : i + sheet.per_page] for i in range(0, len(cards), sheet.per_page)] or [[]]
    room = f"{location.code} — {location.name}"
    pages: list[dict[str, Any]] = []
    for n, chunk in enumerate(chunks):
        rows = _rows(grid, chunk)
        rect = _fitted(_plan_box(rows), plan_size) if plan_size else None
        legend: dict[str, str] = {}  # the types of the page and their colour
        for card in chunk:
            if card and sheet.color_by_type:
                legend.setdefault(card["type"] or fr.LABEL_NO_TYPE, card["color"])
        pages.append(
            {
                "title": sheet.name,
                "room": room,
                "number": n + 1,
                "count": len(chunks),
                "plan": plan_src,
                "plan_rect": rect,
                "dots": _dots(chunk, rect, sheet.plan_rotation) if rect else [],
                "legend": legend,
                "colored": bool(sheet.color_by_type),
                "col_widths": grid.col_widths,
                "rows": rows,
            }
        )
    return pages


def installation_context(
    session: Session,
    files_dir: Path,
    project_id: int,
    sheets: list[InstallationSheet],
    today: date,
    printable: bool = False,
) -> dict[str, Any]:
    pages = [page for sheet in sheets for page in _pages(session, files_dir, sheet)]
    header = document_header(session, project_id, today)
    return {
        **header,
        "studio_footer": True,
        "printable": printable,
        "title": fr.INSTALLATION_PDF_TITLE.format(project=header["project"]["code"]),
        "grid": {"width": WIDTH},
        "pages": pages,
    }


def build_installation(
    session: Session,
    files_dir: Path,
    project_id: int,
    sheets: list[InstallationSheet],
    today: date,
    printable: bool = False,
) -> tuple[str, bytes]:
    context = installation_context(session, files_dir, project_id, sheets, today, printable)
    html = render_html("installation.html", context)
    return html, render_pdf(html, files_dir)
