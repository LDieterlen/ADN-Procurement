"""Prescription document (ADR-0010, ADR-0012): a cover, the list of prescriptions grouped by zone,
then one sheet per article (photo + drawing, manufacturer, reference, finish, dimensions, comments,
link, supplier contact, diffusion, validation). Never a purchase price."""

from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.exports.pdf import milli_text, render_html, render_pdf
from ffe.i18n import fr
from ffe.models import (
    Category,
    Client,
    Manufacturer,
    Product,
    Project,
    ProjectItem,
    Setting,
    Supplier,
    Zone,
)
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


def _file_of(
    item: ProjectItem, product: Product | None, primary: bool, kind: str | None
) -> tuple[str | None, str | None]:
    """Main photo (`primary`) or first file of `kind` of the line, else of the product."""
    for junctions in (item.files, product.files if product is not None else []):
        for junction in junctions:
            if (primary and junction.is_primary) or (kind and junction.kind == kind):
                return junction.file.filename, junction.file.license_note
    return None, None


def book_context(
    session: Session, project_id: int, today: date, indice: str | None = None
) -> dict[str, Any]:
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
    suppliers = {s.id: s for s in session.scalars(select(Supplier))}
    categories = {c.id: c for c in session.scalars(select(Category))}
    items = [
        i
        for i in list_items(session, project_id)
        if i.status not in ("cancelled", "replaced") and i.kind != "fee"
    ]
    by_zone: dict[int | None, list[dict[str, Any]]] = {}
    for item in items:
        product = session.get(Product, item.product_id) if item.product_id is not None else None
        photo, license_note = _file_of(item, product, True, None)
        drawing, _ = _file_of(item, product, False, "drawing")
        category = categories.get(item.category_id)
        typology = categories[category.parent_id] if category and category.parent_id else category
        supplier = suppliers.get(item.supplier_id) if item.supplier_id else None
        pairs = [
            (p.qty_milli, next((z.multiplier for z in zones if z.id == p.zone_id), 1))
            for p in item.placements
        ]
        total = money.total_qty_milli(pairs)
        for placement in item.placements:
            by_zone.setdefault(placement.zone_id, []).append(
                {
                    "item_code": item.item_code,
                    "typology": typology.name if typology else "",
                    "name": item.name,
                    "location": fr.ITEM_LOCATION_LABELS.get(item.location or "", ""),
                    "indice": item.indice or "",
                    "client_description": item.client_description,
                    "kind_label": fr.ITEM_KIND_LABELS[item.kind],
                    "manufacturer": (
                        manufacturers.get(product.manufacturer_id)
                        if product and product.manufacturer_id
                        else None
                    ),
                    "product_name": product.name if product else item.name,
                    "reference": (
                        (product.manufacturer_ref or product.supplier_ref) if product else None
                    ),
                    "finish": item.finish,
                    "color": item.color,
                    "materials": item.materials,
                    "dimensions": _dimensions(item),
                    "qty_text": milli_text(placement.qty_milli),
                    "qty_total_text": milli_text(total),
                    "link": product.source_url if product else None,
                    "supplier_name": supplier.name if supplier else None,
                    "representative": supplier.contact_name if supplier else None,
                    "phone": supplier.phone if supplier else None,
                    "email": supplier.email if supplier else None,
                    "photo": photo,
                    "drawing": drawing,
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
        "title": f"Prescriptions {project.code}",
        "footer": f"{setting.agency_name or 'FFE'} · {project.code} {project.name}",
        "agency": {"name": setting.agency_name, "address": setting.agency_address},
        "project": {"code": project.code, "name": project.name},
        "client_name": client.name if client else "",
        "issued_on": today.isoformat(),
        "indice": indice or "",
        "item_count": sum(len(z["articles"]) for z in zone_blocks),
        "zone_count": len(zone_blocks),
        "zones": zone_blocks,
    }


def build_book(
    session: Session, files_dir: Path, project_id: int, today: date, indice: str | None = None
) -> tuple[str, bytes]:
    html = render_html("book.html", book_context(session, project_id, today, indice))
    return html, render_pdf(html, files_dir)
