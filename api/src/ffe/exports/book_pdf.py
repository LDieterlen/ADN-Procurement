"""Client book (ADR-0010): one page per article grouped by zone, main photo, never a purchase price."""

from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.exports.pdf import milli_text, render_html, render_pdf
from ffe.i18n import fr
from ffe.models import Client, Manufacturer, Product, Project, ProjectItem, Setting, Zone
from ffe.services.project_item import list_items


def _dimensions(item: ProjectItem) -> str:
    parts = [
        f"{label} {value} mm"
        for label, value in (
            ("L", item.width_mm),
            ("P", item.depth_mm),
            ("H", item.height_mm),
            ("Ø", item.diameter_mm),
        )
        if value is not None
    ]
    return " × ".join(parts)


def _photo(session: Session, item: ProjectItem) -> tuple[str | None, str | None]:
    """Main photo of the line, else of the product (DATA_MODEL §4.15); relative to `files/`."""
    for junction in item.files:
        if junction.is_primary:
            return junction.file.filename, junction.file.license_note
    if item.product_id is not None:
        product = session.get(Product, item.product_id)
        if product is not None:
            for junction in product.files:
                if junction.is_primary:
                    return junction.file.filename, junction.file.license_note
    return None, None


def book_context(session: Session, project_id: int, today: date) -> dict[str, Any]:
    project = session.get(Project, project_id)
    assert project is not None
    client = session.get(Client, project.client_id)
    setting = session.get(Setting, 1)
    assert setting is not None
    zones = sorted(
        session.scalars(select(Zone).where(Zone.project_id == project_id)),
        key=lambda z: (z.sort_order, z.id),
    )
    manufacturers = {m.id: m.name for m in session.scalars(select(Manufacturer))}
    items = [
        i
        for i in list_items(session, project_id)
        if i.status not in ("cancelled", "replaced") and i.kind != "fee"
    ]
    by_zone: dict[int | None, list[dict[str, Any]]] = {}
    for item in items:
        photo, license_note = _photo(session, item)
        manufacturer = None
        if item.product_id is not None:
            product = session.get(Product, item.product_id)
            if product is not None and product.manufacturer_id is not None:
                manufacturer = manufacturers.get(product.manufacturer_id)
        pairs = [
            (p.qty_milli, next((z.multiplier for z in zones if z.id == p.zone_id), 1))
            for p in item.placements
        ]
        total = money.total_qty_milli(pairs)
        for placement in item.placements:
            by_zone.setdefault(placement.zone_id, []).append(
                {
                    "item_code": item.item_code,
                    "name": item.name,
                    "client_description": item.client_description,
                    "kind_label": fr.ITEM_KIND_LABELS[item.kind],
                    "finish": item.finish,
                    "color": item.color,
                    "materials": item.materials,
                    "dimensions": _dimensions(item),
                    "qty_text": milli_text(placement.qty_milli),
                    "qty_total_text": milli_text(total),
                    "manufacturer": manufacturer,
                    "photo": photo,
                    "license_note": license_note,
                }
            )
    zone_blocks: list[dict[str, Any]] = [
        {"code": z.code, "name": z.name, "multiplier": z.multiplier, "articles": by_zone[z.id]}
        for z in zones
        if z.id in by_zone
    ]
    if None in by_zone:
        zone_blocks.append(
            {"code": None, "name": "Non affecté", "multiplier": 1, "articles": by_zone[None]}
        )
    return {
        "title": f"Book {project.code}",
        "footer": f"{setting.agency_name or 'FFE'} · {project.code} {project.name}",
        "agency": {"name": setting.agency_name, "address": setting.agency_address},
        "project": {"code": project.code, "name": project.name},
        "client_name": client.name if client else "",
        "issued_on": today.isoformat(),
        "item_count": sum(len(z["articles"]) for z in zone_blocks),
        "zone_count": len(zone_blocks),
        "zones": zone_blocks,
    }


def build_book(
    session: Session, files_dir: Path, project_id: int, today: date
) -> tuple[str, bytes]:
    html = render_html("book.html", book_context(session, project_id, today))
    return html, render_pdf(html, files_dir)
