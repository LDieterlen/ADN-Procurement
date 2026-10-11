"""Supplier invoices and payments (API.md « Factures »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.supplier_invoice import InvoiceCreate, InvoicePay, InvoiceRead, InvoiceUpdate
from ffe.services import purchase_order as po_service
from ffe.services import supplier_invoice as service

router = APIRouter(tags=["invoices"])

PoId = Annotated[int, Path(ge=1)]
InvoiceId = Annotated[int, Path(ge=1)]


@router.get("/purchase-orders/{po_id}/invoices", operation_id="listInvoices")
def list_invoices(po_id: PoId, session: SessionDep) -> list[InvoiceRead]:
    po = po_service.get_po(session, po_id)
    return [service.to_read(po, i) for i in service.list_invoices(session, po_id)]


@router.post("/purchase-orders/{po_id}/invoices", status_code=201, operation_id="createInvoice")
def create_invoice(
    po_id: PoId, payload: InvoiceCreate, session: SessionDep, deps: DepsDep
) -> InvoiceRead:
    invoice = service.create_invoice(session, po_id, payload, deps.clock)
    return service.to_read(po_service.get_po(session, po_id), invoice)


@router.patch("/invoices/{invoice_id}", operation_id="updateInvoice")
def update_invoice(
    invoice_id: InvoiceId, payload: InvoiceUpdate, session: SessionDep, deps: DepsDep
) -> InvoiceRead:
    invoice = service.update_invoice(session, invoice_id, payload, deps.clock)
    return service.to_read(po_service.get_po(session, invoice.purchase_order_id), invoice)


@router.post("/invoices/{invoice_id}/pay", operation_id="payInvoice")
def pay_invoice(
    invoice_id: InvoiceId, payload: InvoicePay, session: SessionDep, deps: DepsDep
) -> InvoiceRead:
    invoice = service.pay_invoice(session, invoice_id, payload, deps.clock)
    return service.to_read(po_service.get_po(session, invoice.purchase_order_id), invoice)


@router.delete("/invoices/{invoice_id}", status_code=204, operation_id="deleteInvoice")
def delete_invoice(invoice_id: InvoiceId, session: SessionDep) -> Response:
    service.delete_invoice(session, invoice_id)
    return Response(status_code=204)
