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
from ffe.listing import COLUMNS, in_catalogue_order, printed_groups
from ffe.models import (
    Category,
    Client,
    File,
    Location,
    Project,
    ProjectItem,
    ProjectItemFile,
    Setting,
    Supplier,
)
from ffe.services.choice import labels as choice_labels
from ffe.services.project_item import list_items

BAND = tuple((kind, fr.FILE_KIND_LABELS[kind]) for kind in ("image", "finish", "drawing"))


def main_photo(item: ProjectItem) -> ProjectItemFile | None:
    """The article's photo on every document: the main one, else the first; images only."""
    pictures = [j for j in item.files if j.file.mime_type.startswith("image/")]
    return next((j for j in pictures if j.is_primary), None) or next(
        (j for j in pictures if j.kind == "image"), None
    )


def _images(item: ProjectItem) -> tuple[list[dict[str, Any]], str | None]:
    """The sheet's image band (spec « Fiche 1b » v2): at most one photo (the main one, else the
    first), one finish and one plan, in that order of priority; images only (a PDF plan is not
    drawn). Also the photo's usage note."""
    pictures = [j for j in item.files if j.file.mime_type.startswith("image/")]
    photo = main_photo(item)
    chosen = {"image": photo} | {
        kind: next((j for j in pictures if j.kind == kind), None) for kind in ("finish", "drawing")
    }
    band = [
        {"src": junction.file.filename, "label": label, "kind": kind, "plan": kind == "drawing"}
        for kind, label in BAND
        if (junction := chosen[kind]) is not None
    ]
    return band, photo.file.license_note if photo else None


def coming_changes(session: Session, project_id: int) -> dict[int, str | None]:
    """placement id → what the next diffusion brings to its code (« new », « revised »)."""
    return {
        p.id: item.live_change(p)
        for item in list_items(session, project_id)
        for p in item.placements
    }


def article_rows(
    session: Session,
    project_id: int,
    include_options: bool = False,
    changes: dict[int, str | None] | None = None,
) -> list[dict[str, Any]]:
    """One row per (article, placement), in location order; fee lines are left out. `changes`:
    the marks of an issue taken before its diffusion moved the codes; None = as of now."""
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
        if item.option_letter and not include_options:  # options: alternatives, off the sheets
            continue
        band, license_note = _images(item)
        photo = band[0]["src"] if band and band[0]["kind"] == "image" else None
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
                    "base_code": placement.code if item.option_letter else None,
                    "type": category.name if category else "",
                    "name": item.name,
                    "product_name": item.product_name,
                    "status": fr.ITEM_STATUS_LABELS[item.status],
                    "cancelled": item.status == "cancelled",
                    # The code's indice now (ADR-0022): what the next diffusion gives it.
                    "indice": (item.live_indice(placement) or "-")
                    if not item.option_letter
                    else "-",
                    # New or revised since the previous diffusion (2026-10-16): marked on the sheet.
                    "change": None
                    if item.option_letter
                    else changes.get(placement.id)
                    if changes is not None
                    else item.live_change(placement),
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
                    "location_name": location.name if location else fr.LABEL_UNASSIGNED,
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


def document_header(session: Session, project_id: int, today: date) -> dict[str, Any]:
    project = session.get(Project, project_id)
    assert project is not None
    client = session.get(Client, project.client_id)
    setting = session.get(Setting, 1)
    assert setting is not None
    # The procurement company the project is run for (top right of the sheets), with its logo.
    logo = (
        session.get(File, project.procurement_logo_file_id)
        if project.procurement_logo_file_id
        else None
    )
    agency_logo = (
        session.get(File, setting.agency_logo_file_id) if setting.agency_logo_file_id else None
    )
    return {
        # Bottom left: who made the document (the agency of the settings, 2026-10-16).
        "footer": fr.PDF_MADE_BY.format(agency=setting.agency_name) if setting.agency_name else "",
        "agency": {
            "name": setting.agency_name,
            "email": setting.agency_email,
            "phone": setting.agency_phone,
            "logo": agency_logo.filename if agency_logo else None,  # top left of the sheets
        },
        "project": {"code": project.code, "name": project.name},
        # The procurement company the project is run for (top right of the sheets), with its logo.
        "procurement": {"name": project.procurement_name, "logo": logo.filename if logo else None},
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
    session: Session,
    project_id: int,
    today: date,
    diffusion: int | None = None,
    *,
    files_dir: Path,
    printable: bool = False,
    include_options: bool = False,
    changes: dict[int, str | None] | None = None,
    hide_agency_name: bool = False,
    hide_studio: bool = False,
    hide_agency_logo: bool = False,
) -> dict[str, Any]:
    """`diffusion`: the number of the official diffusion these sheets are issued for (ADR-0022),
    None for a working document."""
    rows = [
        r for r in article_rows(session, project_id, include_options, changes) if not r["cancelled"]
    ]
    for row in rows:
        _place_band(row, files_dir)
    blocks = _by_location(rows)
    header = document_header(session, project_id, today)
    if hide_agency_name:  # advanced options of « Fiches PDF » (2026-10-16)
        header["footer"] = ""
    if hide_agency_logo:
        header["agency"] = {**header["agency"], "logo": None}
    return {
        **header,
        "studio_footer": not hide_studio,  # « Racoon Studio », centred at the bottom of each page
        "printable": printable,
        "title": f"Fiches de prescription {project_id}",
        "diffusion": diffusion,
        "item_count": len(rows),
        "new_count": sum(1 for r in rows if r["change"] == "new"),
        "revised_count": sum(1 for r in rows if r["change"] == "revised"),
        "option_count": sum(1 for r in rows if r["option"]),
        "location_count": len(blocks),
        "locations": blocks,
    }


def list_context(
    session: Session,
    project_id: int,
    today: date,
    printable: bool = False,
    columns: list[str] | None = None,
    profile_name: str | None = None,
    include_options: bool = False,
) -> dict[str, Any]:
    """`columns`: the columns of a listing profile (ADR-0023), None = all of them; options only
    when asked (2026-10-16)."""
    rows = article_rows(session, project_id, include_options=include_options)
    shown = in_catalogue_order(columns) if columns else list(COLUMNS)
    return {
        **document_header(session, project_id, today),
        "printable": printable,
        "title": f"Listing FF&E {project_id}",
        "columns": printed_groups(shown, fr.LISTING_COLUMN_LABELS),
        "profile_name": profile_name,
        "locations": _by_location(rows),
        "row_count": len(rows),
    }


def build_sheets(
    session: Session,
    files_dir: Path,
    project_id: int,
    today: date,
    diffusion: int | None = None,
    printable: bool = False,
    include_options: bool = False,
    changes: dict[int, str | None] | None = None,
    *,
    hide_agency_name: bool = False,
    hide_studio: bool = False,
    hide_agency_logo: bool = False,
) -> tuple[str, bytes]:
    context = sheets_context(
        session,
        project_id,
        today,
        diffusion,
        files_dir=files_dir,
        printable=printable,
        include_options=include_options,
        changes=changes,
        hide_agency_name=hide_agency_name,
        hide_studio=hide_studio,
        hide_agency_logo=hide_agency_logo,
    )
    html = render_html("sheets.html", context)
    return html, render_pdf(html, files_dir)


def build_list(
    session: Session,
    files_dir: Path,
    project_id: int,
    today: date,
    printable: bool = False,
    columns: list[str] | None = None,
    profile_name: str | None = None,
    include_options: bool = False,
) -> tuple[str, bytes]:
    context = list_context(
        session, project_id, today, printable, columns, profile_name, include_options
    )
    html = render_html("list.html", context)
    return html, render_pdf(html, files_dir)
