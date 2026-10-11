"""Purchase-order document (ADR-0010): agency header, supplier, delivery, lines and totals from `PoRead`."""

from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from ffe.exports.pdf import cents_text, milli_text, render_html, render_pdf
from ffe.models import Project, Setting, Supplier
from ffe.services.purchase_order import get_po, to_read


def po_context(session: Session, po_id: int) -> dict[str, Any]:
    po = to_read(session, get_po(session, po_id))
    project = session.get(Project, po.project_id)
    supplier = session.get(Supplier, po.supplier_id)
    setting = session.get(Setting, 1)
    assert project is not None and supplier is not None and setting is not None
    address = ", ".join(
        part
        for part in (
            supplier.address_line1,
            supplier.address_line2,
            " ".join(p for p in (supplier.postal_code, supplier.city) if p),
        )
        if part
    )
    lines = [
        {
            "item_code": line.item_code,
            "description": line.description,
            "qty_text": milli_text(line.qty_milli),
            "unit_text": cents_text(line.unit_cost_cents),
            "discount_text": f"{line.discount_bp / 100:g} %".replace(".", ",")
            if line.discount_bp
            else "",
            "total_text": cents_text(line.total_cents),
        }
        for line in po.lines
    ]
    return {
        "title": f"Bon de commande {po.number}",
        "footer": f"{setting.agency_name or 'FFE'} · {po.number}",
        "agency": {
            "name": setting.agency_name,
            "address": setting.agency_address,
            "email": setting.agency_email,
            "phone": setting.agency_phone,
            "vat_number": setting.agency_vat_number,
        },
        "project": {"code": project.code, "name": project.name},
        "supplier": supplier,
        "supplier_address": address,
        "po": po,
        "lines": lines,
        "totals": {
            "total_text": cents_text(po.total_cents),
            "total_eur_text": cents_text(po.total_eur_cents),
            "vat_text": cents_text(po.vat_cents),
            "ttc_text": cents_text(po.ttc_eur_cents),
            "fx_text": f"{po.fx_rate_micro / 1_000_000:g}".replace(".", ","),
        },
    }


def build_po_pdf(session: Session, files_dir: Path, po_id: int) -> tuple[str, bytes]:
    html = render_html("po.html", po_context(session, po_id))
    return html, render_pdf(html, files_dir)
