"""Prescription documents (ADR-0010, ADR-0013): the spec sheets (cover, list, one sheet per
article) and the listing (one landscape table). Both read the same article rows. Never a price
on the sheets; the listing carries the HT amount."""

from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.exports.pdf import cents_text, milli_text, render_html, render_pdf
from ffe.i18n import fr
from ffe.models import (
    Category,
    Client,
    Location,
    Manufacturer,
    Product,
    Project,
    ProjectItem,
    Setting,
    Supplier,
)
from ffe.services.project_item import list_items


def _file_of(
    item: ProjectItem, product: Product | None, primary: bool, kind: str | None
) -> tuple[str | None, str | None]:
    """Main photo (`primary`) or first file of `kind` of the line, else of the product."""
    for junctions in (item.files, product.files if product is not None else []):
        for junction in junctions:
            if (primary and junction.is_primary) or (kind and junction.kind == kind):
                return junction.file.filename, junction.file.license_note
    return None, None


def article_rows(session: Session, project_id: int) -> list[dict[str, Any]]:
    """One row per (article, placement), in location order; fee lines are left out."""
    locations = {
        z.id: z for z in session.scalars(select(Location).where(Location.project_id == project_id))
    }
    manufacturers = {m.id: m.name for m in session.scalars(select(Manufacturer))}
    suppliers = {s.id: s for s in session.scalars(select(Supplier))}
    categories = {c.id: c for c in session.scalars(select(Category))}
    rows: list[dict[str, Any]] = []
    for item in list_items(session, project_id):
        if item.kind != "product":
            continue
        product = session.get(Product, item.product_id) if item.product_id is not None else None
        photo, license_note = _file_of(item, product, True, None)
        drawing, _ = _file_of(item, product, False, "drawing")
        category = categories.get(item.category_id) if item.category_id else None
        supplier = suppliers.get(item.supplier_id) if item.supplier_id else None
        pairs = [
            (p.qty_milli, locations[p.location_id].multiplier if p.location_id in locations else 1)
            for p in item.placements
        ]
        amounts = money.line_amounts(
            item.unit_cost_cents, item.discount_bp, item.fx_rate_micro, pairs
        )
        for placement in item.placements:
            location = locations.get(placement.location_id) if placement.location_id else None
            rows.append(
                {
                    "item_code": item.item_code,
                    "type": category.name if category else "",
                    "name": item.name,
                    "status": fr.ITEM_STATUS_LABELS[item.status],
                    "cancelled": item.status == "cancelled",
                    "indice": item.indice or "",
                    "family": fr.ITEM_FAMILY_LABELS.get(item.family or "", ""),
                    "usage": fr.ITEM_USAGE_LABELS.get(item.usage or "", ""),
                    "comments": item.comments,
                    "manufacturer": (
                        manufacturers.get(item.manufacturer_id) if item.manufacturer_id else None
                    ),
                    "reference": item.reference,
                    "finish": item.finish,
                    "dimensions": item.dimensions,
                    "link": item.source_url,
                    "supplier_name": supplier.name if supplier else None,
                    "representative": supplier.contact_name if supplier else None,
                    "phone": supplier.phone if supplier else None,
                    "email": supplier.email if supplier else None,
                    "photo": photo,
                    "drawing": drawing,
                    "license_note": license_note,
                    "location_id": location.id if location else None,
                    "location_code": location.code if location else None,
                    "location_name": location.name if location else "Non affecté",
                    "location_sort": (location.sort_order, location.id) if location else (10**9, 0),
                    "zone": location.zone if location else None,
                    "level": location.level if location else None,
                    "multiplier": location.multiplier if location else 1,
                    "qty_text": milli_text(placement.qty_milli),
                    "qty_total_text": milli_text(amounts.total_qty_milli),
                    "total_ht_text": cents_text(amounts.total_ht_cents)
                    if item.status != "cancelled"
                    else "",
                }
            )
    rows.sort(key=lambda r: (r["location_sort"], r["item_code"]))
    return rows


def _by_location(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for row in rows:
        if not blocks or blocks[-1]["location_id"] != row["location_id"]:
            blocks.append(
                {
                    "location_id": row["location_id"],
                    "code": row["location_code"],
                    "name": row["location_name"],
                    "zone": row["zone"],
                    "level": row["level"],
                    "multiplier": row["multiplier"],
                    "articles": [],
                }
            )
        blocks[-1]["articles"].append(row)
    return blocks


def _header(session: Session, project_id: int, today: date) -> dict[str, Any]:
    project = session.get(Project, project_id)
    assert project is not None
    client = session.get(Client, project.client_id)
    setting = session.get(Setting, 1)
    assert setting is not None
    return {
        "footer": f"{setting.agency_name or 'FFE'} · {project.code} {project.name}",
        "agency": {"name": setting.agency_name, "address": setting.agency_address},
        "project": {"code": project.code, "name": project.name},
        "client_name": client.name if client else "",
        "issued_on": today.isoformat(),
    }


def sheets_context(
    session: Session, project_id: int, today: date, indice: str | None = None
) -> dict[str, Any]:
    rows = [r for r in article_rows(session, project_id) if not r["cancelled"]]
    blocks = _by_location(rows)
    return {
        **_header(session, project_id, today),
        "title": f"Fiches de prescription {project_id}",
        "indice": indice or "",
        "item_count": len(rows),
        "location_count": len(blocks),
        "locations": blocks,
    }


def list_context(session: Session, project_id: int, today: date) -> dict[str, Any]:
    rows = article_rows(session, project_id)
    return {
        **_header(session, project_id, today),
        "title": f"Listing FF&E {project_id}",
        "locations": _by_location(rows),
        "row_count": len(rows),
    }


def build_sheets(
    session: Session, files_dir: Path, project_id: int, today: date, indice: str | None = None
) -> tuple[str, bytes]:
    html = render_html("sheets.html", sheets_context(session, project_id, today, indice))
    return html, render_pdf(html, files_dir)


def build_list(
    session: Session, files_dir: Path, project_id: int, today: date
) -> tuple[str, bytes]:
    html = render_html("list.html", list_context(session, project_id, today))
    return html, render_pdf(html, files_dir)
