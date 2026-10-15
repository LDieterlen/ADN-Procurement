"""Prescription documents (ADR-0010, ADR-0013): the spec sheets (cover, list, one sheet per
article) and the listing (one landscape table). Both read the same article rows. Never a price
on the sheets; the listing carries the HT amount."""

from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.exports.pdf import (
    band_layout,
    cents_text,
    image_traits,
    milli_text,
    padded_image,
    render_html,
    render_pdf,
)
from ffe.i18n import fr
from ffe.models import (
    Category,
    Client,
    Location,
    Project,
    ProjectItem,
    Setting,
    Supplier,
)
from ffe.services.choice import labels as choice_labels
from ffe.services.project_item import list_items

BAND = (("image", "Photo"), ("finish", "Finition"), ("drawing", "Plan"))


def _images(item: ProjectItem) -> tuple[list[dict[str, Any]], str | None]:
    """The sheet's image band (spec « Fiche 1b » v2): at most one photo (the main one, else the
    first), one finish and one plan, in that order of priority; images only (a PDF plan is not
    drawn). Also the photo's usage note."""
    pictures = [j for j in item.files if j.file.mime_type.startswith("image/")]
    photo = next((j for j in pictures if j.is_primary), None) or next(
        (j for j in pictures if j.kind == "image"), None
    )
    chosen = {"image": photo} | {
        kind: next((j for j in pictures if j.kind == kind), None) for kind in ("finish", "drawing")
    }
    band = [
        {"src": junction.file.filename, "label": label, "kind": kind, "plan": kind == "drawing"}
        for kind, label in BAND
        if (junction := chosen[kind]) is not None
    ]
    return band, photo.file.license_note if photo else None


def article_rows(session: Session, project_id: int) -> list[dict[str, Any]]:
    """One row per (article, placement), in location order; fee lines are left out."""
    locations = {
        z.id: z for z in session.scalars(select(Location).where(Location.project_id == project_id))
    }
    suppliers = {s.id: s for s in session.scalars(select(Supplier))}
    categories = {c.id: c for c in session.scalars(select(Category))}
    families = choice_labels(session, "family")
    usages = choice_labels(session, "usage")
    rows: list[dict[str, Any]] = []
    for item in list_items(session, project_id):
        if item.kind != "product":
            continue
        band, license_note = _images(item)
        photo = band[0]["src"] if band and band[0]["label"] == "Photo" else None
        category = categories.get(item.category_id) if item.category_id else None
        supplier = suppliers.get(item.supplier_id) if item.supplier_id else None
        # An option takes its base's placements and codes, with its letter (ADR-0021).
        placed = item.option_of if item.option_of is not None else item
        suffix = f"-{item.option_letter}" if item.option_letter else ""
        pairs = [
            (p.qty_milli, locations[p.location_id].multiplier if p.location_id in locations else 1)
            for p in placed.placements
        ]
        amounts = money.line_amounts(
            item.unit_cost_cents, item.discount_bp, item.fx_rate_micro, pairs
        )
        for placement in placed.placements:
            location = locations.get(placement.location_id) if placement.location_id else None
            rows.append(
                {
                    "item_code": f"{placement.code}{suffix}",
                    "option": item.option_letter,
                    "type": category.name if category else "",
                    "name": item.name,
                    "product_name": item.product_name,
                    "status": fr.ITEM_STATUS_LABELS[item.status],
                    "cancelled": item.status == "cancelled",
                    "indice": item.indice or "",
                    "family": families.get(item.family or "", ""),
                    "usage": usages.get(item.usage or "", ""),
                    "comments": item.comments,
                    "reference": item.reference,
                    "finish": item.finish,
                    "dimensions": item.dimensions,
                    "lead_time": item.lead_time,
                    "link": item.source_url,
                    "supplier_name": supplier.name if supplier else None,
                    "representative": supplier.contact_name if supplier else None,
                    "phone": (supplier.mobile or supplier.phone) if supplier else None,
                    "email": supplier.email if supplier else None,
                    "photo": photo,
                    "band": band,
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
                    # An option is indicative (never in the totals): its amount is in brackets.
                    "total_ht_text": ""
                    if item.status == "cancelled"
                    else f"({cents_text(amounts.total_ht_cents)})"
                    if item.option_letter
                    else cents_text(amounts.total_ht_cents),
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


def _place_band(row: dict[str, Any], files_dir: Path) -> None:
    """Each image of the band gets its box and treatment (`pdf.band_layout`); a whole image is
    drawn padded to its box (`pdf.padded_image`), a cut one is left to CSS `object-fit: cover`."""
    band = row["band"]
    if band:
        traits = [(image_traits(files_dir / image["src"]), image["kind"]) for image in band]
        for image, placed in zip(band, band_layout(traits), strict=True):
            image["box"] = placed["box"]
            if placed["mode"] != "cover":
                color = placed.get("color")
                padded = padded_image(files_dir / image["src"], placed["box"][2:], color)
                image["src"] = padded or image["src"]  # unreadable: left to the PDF engine


def sheets_context(
    session: Session, project_id: int, today: date, indice: str | None = None, *, files_dir: Path
) -> dict[str, Any]:
    rows = [r for r in article_rows(session, project_id) if not r["cancelled"]]
    for row in rows:
        _place_band(row, files_dir)
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
    context = sheets_context(session, project_id, today, indice, files_dir=files_dir)
    html = render_html("sheets.html", context)
    return html, render_pdf(html, files_dir)


def build_list(
    session: Session, files_dir: Path, project_id: int, today: date
) -> tuple[str, bytes]:
    html = render_html("list.html", list_context(session, project_id, today))
    return html, render_pdf(html, files_dir)
