"""Purchase orders (ADR-0007): one project, one supplier, one currency; annual numbering never
decremented; issuing locks the project lines (`ordered`, `order_ref`); « Engagé » for the budget."""

from datetime import date
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import (
    Project,
    ProjectItem,
    PurchaseOrder,
    PurchaseOrderFile,
    PurchaseOrderLine,
    Supplier,
    Zone,
)
from ffe.models.purchase_order import PO_ENGAGED_STATUSES
from ffe.schemas.purchase_order import (
    PoCreate,
    PoFileAttach,
    PoFileRead,
    PoLineRead,
    PoLinesAdd,
    PoLineUpdate,
    PoRead,
    PoStatusChange,
    PoUpdate,
)
from ffe.services.base import stamp
from ffe.services.file import get_file, unlink_if_orphan
from ffe.services.project import ensure_open, get_project
from ffe.services.project_item import check_preconditions, get_item, resolve_fx, write_event

NUMBER_PREFIX = "PO"
NUMBER_WIDTH = 3
PO_TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"cancelled"}),
    "issued": frozenset({"acknowledged", "closed", "cancelled"}),
    "acknowledged": frozenset({"closed", "cancelled"}),
    "partially_delivered": frozenset({"closed"}),
    "closed": frozenset(),
    "cancelled": frozenset(),
}
TERMINAL = frozenset({"closed", "cancelled"})


def _err(field: str, message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail(field, message)])


# --- read -------------------------------------------------------------------------------------


def get_po(session: Session, po_id: int) -> PurchaseOrder:
    po = session.get(PurchaseOrder, po_id)
    if po is None:
        raise NotFoundError("purchase_order", po_id)
    return po


def get_line(session: Session, line_id: int) -> PurchaseOrderLine:
    line = session.get(PurchaseOrderLine, line_id)
    if line is None:
        raise NotFoundError("purchase_order_line", line_id)
    return line


def list_pos(session: Session, project_id: int) -> list[PurchaseOrder]:
    get_project(session, project_id)
    return list(
        session.scalars(
            select(PurchaseOrder)
            .where(PurchaseOrder.project_id == project_id)
            .order_by(PurchaseOrder.id)
        )
    )


def _line_amounts(po: PurchaseOrder, line: PurchaseOrderLine) -> money.PoLineAmounts:
    return money.po_line_amounts(
        line.unit_cost_cents, line.discount_bp, line.qty_milli, po.fx_rate_micro
    )


def to_read(session: Session, po: PurchaseOrder) -> PoRead:
    from ffe.services.delivery import list_deliveries, received_by_line  # noqa: PLC0415
    from ffe.services.supplier_invoice import list_invoices  # noqa: PLC0415

    supplier = session.get(Supplier, po.supplier_id)
    assert supplier is not None
    received = received_by_line(session, po.id)
    invoices = list_invoices(session, po.id)
    lines: list[PoLineRead] = []
    for_totals: list[tuple[money.PoLineAmounts, int]] = []
    for line in po.lines:
        item = session.get(ProjectItem, line.project_item_id)
        assert item is not None
        amounts = _line_amounts(po, line)
        for_totals.append((amounts, line.vat_rate_bp))
        lines.append(
            PoLineRead(
                id=line.id,
                purchase_order_id=po.id,
                project_item_id=line.project_item_id,
                item_code=item.item_code,
                item_status=item.status,
                description=line.description,
                qty_milli=line.qty_milli,
                unit_cost_cents=line.unit_cost_cents,
                discount_bp=line.discount_bp,
                vat_rate_bp=line.vat_rate_bp,
                sort_order=line.sort_order,
                net_unit_cents=amounts.net_unit_cents,
                total_cents=amounts.total_cents,
                net_unit_eur_cents=amounts.net_unit_eur_cents,
                total_eur_cents=amounts.total_eur_cents,
                received_qty_milli=received.get(line.id, 0),
            )
        )
    totals = money.po_totals(for_totals)
    return PoRead(
        id=po.id,
        project_id=po.project_id,
        supplier_id=po.supplier_id,
        supplier_name=supplier.name,
        number=po.number,
        status=po.status,  # type: ignore[arg-type]
        currency=po.currency,
        fx_rate_micro=po.fx_rate_micro,
        issued_on=po.issued_on,
        expected_delivery_on=po.expected_delivery_on,
        supplier_ref=po.supplier_ref,
        delivery_address=po.delivery_address,
        delivery_contact=po.delivery_contact,
        payment_terms=po.payment_terms,
        notes=po.notes,
        internal_notes=po.internal_notes,
        total_cents=totals.total_cents,
        total_eur_cents=totals.total_eur_cents,
        vat_by_rate_bp=totals.vat_by_rate_bp,
        vat_cents=totals.vat_cents,
        ttc_eur_cents=totals.ttc_eur_cents,
        invoiced_ht_cents=sum(i.amount_ht_cents for i in invoices),
        paid_ht_cents=sum(i.amount_ht_cents for i in invoices if i.paid_on is not None),
        deliveries_count=len(list_deliveries(session, po.id)),
        lines=lines,
        files=[
            PoFileRead(
                file_id=j.file_id,
                caption=j.caption,
                sha256=j.file.sha256,
                ext=j.file.ext,
                mime_type=j.file.mime_type,
                original_name=j.file.original_name,
                size_bytes=j.file.size_bytes,
            )
            for j in po.files
        ],
        created_at=po.created_at,
        updated_at=po.updated_at,
    )


def engaged(session: Session, project_id: int) -> dict[int, tuple[int, int]]:
    """« Engagé » per project item: (net unit EUR of the order, total EUR) for the lines of the
    orders that count (ADR-0007: issued, acknowledged, partially delivered, closed)."""
    result: dict[int, tuple[int, int]] = {}
    rows = session.execute(
        select(PurchaseOrderLine, PurchaseOrder)
        .join(PurchaseOrder, PurchaseOrder.id == PurchaseOrderLine.purchase_order_id)
        .where(
            PurchaseOrder.project_id == project_id,
            PurchaseOrder.status.in_(PO_ENGAGED_STATUSES),
        )
    ).all()
    for line, po in rows:
        amounts = _line_amounts(po, line)
        previous = result.get(line.project_item_id, (0, 0))
        result[line.project_item_id] = (
            amounts.net_unit_eur_cents,
            previous[1] + amounts.total_eur_cents,
        )
    return result


# --- write ------------------------------------------------------------------------------------


def next_number(session: Session, year: int) -> str:
    value = session.execute(
        text(
            "INSERT INTO po_sequence (year, next_value) VALUES (:y, 2) "
            "ON CONFLICT (year) DO UPDATE SET next_value = next_value + 1 "
            "RETURNING next_value - 1"
        ),
        {"y": year},
    ).scalar_one()
    return f"{NUMBER_PREFIX}-{year}-{int(value):0{NUMBER_WIDTH}d}"


def _open_po_number_for(session: Session, item_id: int, exclude_po_id: int | None) -> str | None:
    stmt = (
        select(PurchaseOrder.number)
        .join(PurchaseOrderLine, PurchaseOrderLine.purchase_order_id == PurchaseOrder.id)
        .where(PurchaseOrderLine.project_item_id == item_id, PurchaseOrder.status != "cancelled")
    )
    if exclude_po_id is not None:
        stmt = stmt.where(PurchaseOrder.id != exclude_po_id)
    return session.scalar(stmt)


def _check_item(session: Session, po: PurchaseOrder, item_id: int, field: str) -> ProjectItem:
    item = session.get(ProjectItem, item_id)
    if item is None or item.project_id != po.project_id:
        raise _err(field, fr.PO_ITEM_NOT_IN_PROJECT)
    code = item.item_code
    other = _open_po_number_for(session, item_id, po.id)
    if other is not None:
        raise ConflictError(fr.PO_ITEM_ALREADY_ORDERED.format(code=code, number=other))
    if item.supplier_id != po.supplier_id:
        raise _err(field, fr.PO_ITEM_WRONG_SUPPLIER.format(code=code))
    if item.currency != po.currency:
        raise _err(field, fr.PO_ITEM_WRONG_CURRENCY.format(code=code, currency=po.currency))
    if item.status != "approved":
        raise _err(field, fr.PO_ITEM_NOT_APPROVED.format(code=code))
    if item.on_hold:
        raise _err(field, fr.PO_ITEM_ON_HOLD.format(code=code))
    if any(line.project_item_id == item_id for line in po.lines):
        raise _err(field, fr.PO_ITEM_ALREADY_ON_PO.format(code=code))
    return item


def _new_line(
    session: Session, po: PurchaseOrder, item: ProjectItem, now: str
) -> PurchaseOrderLine:
    zones = {z.id: z for z in session.scalars(select(Zone).where(Zone.project_id == po.project_id))}
    qty = money.total_qty_milli(
        (p.qty_milli, zones[p.zone_id].multiplier if p.zone_id in zones else 1)
        for p in item.placements
    )
    return PurchaseOrderLine(
        purchase_order_id=po.id,
        project_item_id=item.id,
        project_id=po.project_id,
        description=item.name,
        qty_milli=qty,
        unit_cost_cents=item.unit_cost_cents,
        discount_bp=item.discount_bp,
        vat_rate_bp=item.vat_rate_bp,
        sort_order=len(po.lines),
        created_at=now,
        updated_at=now,
    )


def create_po(session: Session, project_id: int, data: PoCreate, clock: Clock) -> PurchaseOrder:
    with session.begin():
        project = ensure_open(get_project(session, project_id))
        supplier = session.get(Supplier, data.supplier_id)
        if supplier is None:
            raise _err("supplierId", fr.PO_SUPPLIER_NOT_FOUND)
        if supplier.archived_at is not None:
            raise _err("supplierId", fr.PO_SUPPLIER_ARCHIVED)
        currency = supplier.currency
        if currency == "EUR":
            if data.fx_rate_micro not in (None, money.EUR_RATE_MICRO):
                raise _err("fxRateMicro", fr.ITEM_FX_EUR_IS_ONE)
            fx = money.EUR_RATE_MICRO
        elif data.fx_rate_micro is not None:
            fx = data.fx_rate_micro
        else:
            first = session.get(ProjectItem, data.item_ids[0]) if data.item_ids else None
            fx = (
                first.fx_rate_micro
                if first is not None and first.currency == currency
                else resolve_fx(session, project_id, currency, None)
            )
        now = stamp(clock)
        po = PurchaseOrder(
            project_id=project_id,
            supplier_id=supplier.id,
            number=next_number(session, clock().year),
            status="draft",
            currency=currency,
            fx_rate_micro=fx,
            expected_delivery_on=data.expected_delivery_on,
            delivery_address=project.delivery_address or project.site_address,
            delivery_contact=project.delivery_contact,
            payment_terms=supplier.payment_terms,
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )
        session.add(po)
        session.flush()
        for index, item_id in enumerate(data.item_ids):
            item = _check_item(session, po, item_id, f"itemIds.{index}")
            po.lines.append(_new_line(session, po, item, now))
    session.refresh(po)
    return po


def _editable(session: Session, po_id: int) -> PurchaseOrder:
    po = get_po(session, po_id)
    ensure_open(get_project(session, po.project_id))
    if po.status in TERMINAL:
        raise ConflictError(
            fr.PO_CLOSED.format(number=po.number, status=fr.PO_STATUS_LABELS[po.status].lower())
        )
    return po


def _draft(session: Session, po_id: int) -> PurchaseOrder:
    po = _editable(session, po_id)
    if po.status != "draft":
        raise ConflictError(
            fr.PO_NOT_DRAFT.format(number=po.number, status=fr.PO_STATUS_LABELS[po.status].lower())
        )
    return po


def update_po(session: Session, po_id: int, data: PoUpdate, clock: Clock) -> PurchaseOrder:
    with session.begin():
        po = _editable(session, po_id)
        for field_name, value in data.model_dump(exclude_unset=True).items():
            setattr(po, field_name, value)
        po.updated_at = stamp(clock)
    session.refresh(po)
    return po


def delete_po(session: Session, po_id: int) -> None:
    with session.begin():
        po = _draft(session, po_id)
        session.delete(po)


def add_lines(session: Session, po_id: int, data: PoLinesAdd, clock: Clock) -> PurchaseOrder:
    with session.begin():
        po = _draft(session, po_id)
        now = stamp(clock)
        for index, item_id in enumerate(data.item_ids):
            item = _check_item(session, po, item_id, f"itemIds.{index}")
            po.lines.append(_new_line(session, po, item, now))
        po.updated_at = now
    session.refresh(po)
    return po


def update_line(session: Session, line_id: int, data: PoLineUpdate, clock: Clock) -> PurchaseOrder:
    with session.begin():
        line = get_line(session, line_id)
        po = _draft(session, line.purchase_order_id)
        for field_name, value in data.model_dump(exclude_unset=True).items():
            setattr(line, field_name, value)
        line.updated_at = po.updated_at = stamp(clock)
    session.refresh(po)
    return po


def delete_line(session: Session, line_id: int, clock: Clock) -> PurchaseOrder:
    with session.begin():
        line = get_line(session, line_id)
        po = _draft(session, line.purchase_order_id)
        po.lines.remove(line)
        po.updated_at = stamp(clock)
    session.refresh(po)
    return po


def issue_po(session: Session, po_id: int, clock: Clock, today: date) -> PurchaseOrder:
    """`draft → issued`: the transaction of ADR-0007 that locks every project line (`ordered`)."""
    with session.begin():
        po = _draft(session, po_id)
        if not po.lines:
            raise _err("lines", fr.PO_NO_LINES)
        now = stamp(clock)
        for line in po.lines:
            item = get_item(session, line.project_item_id)
            if item.status != "approved":
                raise ConflictError(fr.PO_ITEM_NOT_APPROVED.format(code=item.item_code))
            if item.on_hold:
                raise ConflictError(fr.PO_ITEM_ON_HOLD.format(code=item.item_code))
            item.order_ref = po.number
            if po.expected_delivery_on is not None:
                item.expected_delivery_on = po.expected_delivery_on
            check_preconditions(session, item, "ordered")
            item.status = "ordered"
            item.updated_at = now
            write_event(
                session,
                item,
                "status",
                clock,
                from_status="approved",
                to_status="ordered",
                note=po.number,
            )
        po.status = "issued"
        po.issued_on = today.isoformat()
        po.updated_at = now
    session.refresh(po)
    return po


def change_status(
    session: Session, po_id: int, data: PoStatusChange, clock: Clock
) -> PurchaseOrder:
    with session.begin():
        po = _editable(session, po_id)
        if data.status not in PO_TRANSITIONS[po.status]:
            raise ConflictError(
                fr.PO_TRANSITION.format(
                    number=po.number,
                    from_status=fr.PO_STATUS_LABELS[po.status].lower(),
                    to_status=fr.PO_STATUS_LABELS[data.status].lower(),
                )
            )
        now = stamp(clock)
        if data.status == "cancelled" and po.status != "draft":
            if not (data.note and data.note.strip()):
                raise _err("note", fr.PO_NOTE_REQUIRED)
            note = fr.PO_CANCELLED_NOTE.format(number=po.number, note=data.note.strip())
            for line in po.lines:
                item = get_item(session, line.project_item_id)
                if item.status in ("cancelled", "replaced"):
                    continue
                previous = item.status
                item.status = "cancelled"
                item.updated_at = now
                write_event(
                    session,
                    item,
                    "status",
                    clock,
                    from_status=previous,
                    to_status="cancelled",
                    note=note,
                )
        po.status = data.status
        po.updated_at = now
    session.refresh(po)
    return po


def attach_file(session: Session, po_id: int, data: PoFileAttach, clock: Clock) -> PurchaseOrder:
    with session.begin():
        po = _editable(session, po_id)
        get_file(session, data.file_id)
        if any(j.file_id == data.file_id for j in po.files):
            raise ConflictError(fr.PO_FILE_ALREADY_ATTACHED)
        now = stamp(clock)
        po.files.append(
            PurchaseOrderFile(
                file_id=data.file_id, caption=data.caption, created_at=now, updated_at=now
            )
        )
        po.updated_at = now
    session.refresh(po)
    return po


def detach_file(
    session: Session, po_id: int, file_id: int, files_dir: Any, clock: Clock
) -> PurchaseOrder:
    with session.begin():
        po = _editable(session, po_id)
        junction = next((j for j in po.files if j.file_id == file_id), None)
        if junction is None:
            raise ConflictError(fr.PO_FILE_NOT_ATTACHED)
        po.files.remove(junction)
        po.updated_at = stamp(clock)
    unlink_if_orphan(session, files_dir, file_id)
    session.refresh(po)
    return po


def project_of(session: Session, po: PurchaseOrder) -> Project:
    return get_project(session, po.project_id)
