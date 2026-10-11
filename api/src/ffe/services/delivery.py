"""Receipts of a purchase order (ADR-0008): partial or complete, per order line; a complete receipt
moves the project line to `delivered`; deleting one is a data-entry correction."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import Delivery, DeliveryLine, ProjectItem, PurchaseOrder, PurchaseOrderLine
from ffe.schemas.delivery import DeliveryCreate, DeliveryLineRead, DeliveryRead
from ffe.services.base import stamp
from ffe.services.project import ensure_open, get_project
from ffe.services.project_item import write_event
from ffe.services.purchase_order import get_po

RECEIVABLE = frozenset({"issued", "acknowledged", "partially_delivered", "closed"})


def _err(field: str, message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail(field, message)])


def get_delivery(session: Session, delivery_id: int) -> Delivery:
    delivery = session.get(Delivery, delivery_id)
    if delivery is None:
        raise NotFoundError("delivery", delivery_id)
    return delivery


def list_deliveries(session: Session, po_id: int) -> list[Delivery]:
    return list(
        session.scalars(
            select(Delivery).where(Delivery.purchase_order_id == po_id).order_by(Delivery.id)
        )
    )


def received_by_line(session: Session, po_id: int) -> dict[int, int]:
    """Σ received qty per purchase-order line (Python sum, DATA_MODEL « zéro somme en SQL »)."""
    totals: dict[int, int] = {}
    for delivery in list_deliveries(session, po_id):
        for line in delivery.lines:
            totals[line.purchase_order_line_id] = (
                totals.get(line.purchase_order_line_id, 0) + line.qty_milli
            )
    return totals


def to_read(session: Session, delivery: Delivery) -> DeliveryRead:
    lines: list[DeliveryLineRead] = []
    for line in delivery.lines:
        po_line = session.get(PurchaseOrderLine, line.purchase_order_line_id)
        item = session.get(ProjectItem, po_line.project_item_id) if po_line else None
        lines.append(
            DeliveryLineRead(
                id=line.id,
                purchase_order_line_id=line.purchase_order_line_id,
                item_code=item.item_code if item else "",
                qty_milli=line.qty_milli,
                remarks=line.remarks,
            )
        )
    return DeliveryRead(
        id=delivery.id,
        purchase_order_id=delivery.purchase_order_id,
        received_on=delivery.received_on,
        reference=delivery.reference,
        notes=delivery.notes,
        lines=lines,
        created_at=delivery.created_at,
        updated_at=delivery.updated_at,
    )


def _sync_statuses(session: Session, po: PurchaseOrder, clock: Clock, note: str) -> None:
    """Project lines `delivered` when fully received (back to `ordered` otherwise, after a
    deletion); order `partially_delivered` or `closed` (or back to `acknowledged`)."""
    received = received_by_line(session, po.id)
    now = stamp(clock)
    complete = True
    any_received = False
    for po_line in po.lines:
        got = received.get(po_line.id, 0)
        any_received = any_received or got > 0
        item = session.get(ProjectItem, po_line.project_item_id)
        assert item is not None
        if got >= po_line.qty_milli:
            if item.status == "ordered":
                item.status = "delivered"
                item.updated_at = now
                write_event(
                    session,
                    item,
                    "status",
                    clock,
                    from_status="ordered",
                    to_status="delivered",
                    note=note,
                )
        else:
            complete = False
            if item.status == "delivered":
                item.status = "ordered"
                item.updated_at = now
                write_event(
                    session,
                    item,
                    "status",
                    clock,
                    from_status="delivered",
                    to_status="ordered",
                    note=note,
                )
    if po.status in RECEIVABLE:
        target = "closed" if complete else "partially_delivered" if any_received else "acknowledged"
        if po.status != target:
            po.status = target
            po.updated_at = now


def create_delivery(session: Session, po_id: int, data: DeliveryCreate, clock: Clock) -> Delivery:
    with session.begin():
        po = get_po(session, po_id)
        ensure_open(get_project(session, po.project_id))
        if po.status not in RECEIVABLE:
            raise ConflictError(
                fr.DELIVERY_PO_NOT_ISSUED.format(
                    number=po.number, status=fr.PO_STATUS_LABELS[po.status].lower()
                )
            )
        if not data.lines:
            raise _err("lines", fr.DELIVERY_NO_LINES)
        po_lines = {line.id: line for line in po.lines}
        received = received_by_line(session, po.id)
        seen: set[int] = set()
        for index, line in enumerate(data.lines):
            field = f"lines.{index}.purchaseOrderLineId"
            if line.purchase_order_line_id not in po_lines:
                raise _err(field, fr.DELIVERY_LINE_NOT_IN_PO.format(id=line.purchase_order_line_id))
            if line.purchase_order_line_id in seen:
                raise _err(field, fr.DELIVERY_LINE_DUPLICATE)
            seen.add(line.purchase_order_line_id)
            po_line = po_lines[line.purchase_order_line_id]
            already = received.get(po_line.id, 0)
            if already + line.qty_milli > po_line.qty_milli:
                item = session.get(ProjectItem, po_line.project_item_id)
                raise _err(
                    f"lines.{index}.qtyMilli",
                    fr.DELIVERY_QTY_EXCEEDS.format(
                        code=item.item_code if item else po_line.id,
                        received=money.div_round(already, 1),
                        ordered=po_line.qty_milli,
                        asked=already + line.qty_milli - po_line.qty_milli,
                    ),
                )
        now = stamp(clock)
        delivery = Delivery(
            purchase_order_id=po.id,
            received_on=data.received_on,
            reference=data.reference,
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )
        session.add(delivery)
        session.flush()
        for line in data.lines:
            delivery.lines.append(
                DeliveryLine(
                    delivery_id=delivery.id,
                    purchase_order_line_id=line.purchase_order_line_id,
                    qty_milli=line.qty_milli,
                    remarks=line.remarks,
                    created_at=now,
                    updated_at=now,
                )
            )
        session.flush()
        _sync_statuses(
            session,
            po,
            clock,
            fr.DELIVERY_NOTE.format(reference=data.reference or "—", on=data.received_on),
        )
    session.refresh(delivery)
    return delivery


def delete_delivery(session: Session, delivery_id: int, clock: Clock) -> PurchaseOrder:
    with session.begin():
        delivery = get_delivery(session, delivery_id)
        po = get_po(session, delivery.purchase_order_id)
        ensure_open(get_project(session, po.project_id))
        for line in delivery.lines:
            po_line = session.get(PurchaseOrderLine, line.purchase_order_line_id)
            item = session.get(ProjectItem, po_line.project_item_id) if po_line else None
            if item is not None and item.status == "installed":
                raise ConflictError(fr.DELIVERY_LINE_INSTALLED.format(code=item.item_code))
        note = fr.DELIVERY_DELETED_NOTE.format(
            reference=delivery.reference or "—", on=delivery.received_on
        )
        session.delete(delivery)
        session.flush()
        _sync_statuses(session, po, clock, note)
    session.refresh(po)
    return po
