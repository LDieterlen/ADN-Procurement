"""Supplier invoices and their payment (ADR-0008): figures as printed, in the order's currency;
Invoiced / Paid for the budget in EUR at the order's rate."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import PurchaseOrder, SupplierInvoice
from ffe.schemas.supplier_invoice import InvoiceCreate, InvoicePay, InvoiceRead, InvoiceUpdate
from ffe.services.base import stamp
from ffe.services.project import ensure_open, get_project
from ffe.services.purchase_order import get_po


def _err(field: str, message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail(field, message)])


def get_invoice(session: Session, invoice_id: int) -> SupplierInvoice:
    invoice = session.get(SupplierInvoice, invoice_id)
    if invoice is None:
        raise NotFoundError("supplier_invoice", invoice_id)
    return invoice


def list_invoices(session: Session, po_id: int) -> list[SupplierInvoice]:
    return list(
        session.scalars(
            select(SupplierInvoice)
            .where(SupplierInvoice.purchase_order_id == po_id)
            .order_by(SupplierInvoice.invoiced_on, SupplierInvoice.id)
        )
    )


def to_read(po: PurchaseOrder, invoice: SupplierInvoice) -> InvoiceRead:
    return InvoiceRead(
        id=invoice.id,
        purchase_order_id=invoice.purchase_order_id,
        kind=invoice.kind,  # type: ignore[arg-type]
        reference=invoice.reference,
        invoiced_on=invoice.invoiced_on,
        due_on=invoice.due_on,
        amount_ht_cents=invoice.amount_ht_cents,
        vat_cents=invoice.vat_cents,
        ttc_cents=money.invoice_ttc_cents(invoice.amount_ht_cents, invoice.vat_cents),
        amount_ht_eur_cents=money.net_unit_eur_cents(invoice.amount_ht_cents, po.fx_rate_micro),
        paid_on=invoice.paid_on,
        payment_ref=invoice.payment_ref,
        notes=invoice.notes,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
    )


def invoiced_and_paid(session: Session, project_id: int) -> tuple[int, int]:
    """(Invoiced HT EUR, Paid HT EUR) of a project: invoices of its non-cancelled orders."""
    invoiced = paid = 0
    rows = session.execute(
        select(SupplierInvoice, PurchaseOrder)
        .join(PurchaseOrder, PurchaseOrder.id == SupplierInvoice.purchase_order_id)
        .where(PurchaseOrder.project_id == project_id, PurchaseOrder.status != "cancelled")
    ).all()
    for invoice, po in rows:
        eur = money.net_unit_eur_cents(invoice.amount_ht_cents, po.fx_rate_micro)
        invoiced += eur
        if invoice.paid_on is not None:
            paid += eur
    return invoiced, paid


def _open_po(session: Session, po_id: int) -> PurchaseOrder:
    po = get_po(session, po_id)
    ensure_open(get_project(session, po.project_id))
    if po.status == "cancelled":
        raise ConflictError(fr.INVOICE_PO_CANCELLED.format(number=po.number))
    return po


def _check_reference(session: Session, po_id: int, reference: str, exclude_id: int | None) -> None:
    stmt = select(SupplierInvoice.id).where(
        SupplierInvoice.purchase_order_id == po_id, SupplierInvoice.reference == reference
    )
    if exclude_id is not None:
        stmt = stmt.where(SupplierInvoice.id != exclude_id)
    if session.scalar(stmt) is not None:
        raise _err("reference", fr.INVOICE_REFERENCE_TAKEN)


def _unpaid(invoice: SupplierInvoice) -> None:
    if invoice.paid_on is not None:
        raise ConflictError(
            fr.INVOICE_PAID_FROZEN.format(reference=invoice.reference, on=invoice.paid_on)
        )


def create_invoice(
    session: Session, po_id: int, data: InvoiceCreate, clock: Clock
) -> SupplierInvoice:
    with session.begin():
        po = _open_po(session, po_id)
        _check_reference(session, po.id, data.reference, None)
        now = stamp(clock)
        invoice = SupplierInvoice(
            purchase_order_id=po.id, **data.model_dump(), created_at=now, updated_at=now
        )
        session.add(invoice)
    session.refresh(invoice)
    return invoice


def update_invoice(
    session: Session, invoice_id: int, data: InvoiceUpdate, clock: Clock
) -> SupplierInvoice:
    with session.begin():
        invoice = get_invoice(session, invoice_id)
        _open_po(session, invoice.purchase_order_id)
        changes = data.model_dump(exclude_unset=True)
        if invoice.paid_on is not None and set(changes) - {"notes"}:
            _unpaid(invoice)
        reference = changes.get("reference", invoice.reference)
        if reference != invoice.reference:
            _check_reference(session, invoice.purchase_order_id, reference, invoice.id)
        for field_name, value in changes.items():
            setattr(invoice, field_name, value)
        invoice.updated_at = stamp(clock)
    session.refresh(invoice)
    return invoice


def pay_invoice(
    session: Session, invoice_id: int, data: InvoicePay, clock: Clock
) -> SupplierInvoice:
    with session.begin():
        invoice = get_invoice(session, invoice_id)
        _open_po(session, invoice.purchase_order_id)
        _unpaid(invoice)
        invoice.paid_on = data.paid_on
        invoice.payment_ref = data.payment_ref
        invoice.updated_at = stamp(clock)
    session.refresh(invoice)
    return invoice


def delete_invoice(session: Session, invoice_id: int) -> None:
    with session.begin():
        invoice = get_invoice(session, invoice_id)
        _open_po(session, invoice.purchase_order_id)
        _unpaid(invoice)
        session.delete(invoice)
