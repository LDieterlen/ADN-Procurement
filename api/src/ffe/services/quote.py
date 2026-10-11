"""Supplier quotes: one supplier, one project, frozen currency and rate; one retained line per item
(DATA_MODEL §4.17–4.19, ADR-0006). Retaining copies the quoted values onto the project line and
journals it whatever the status."""

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import ProjectItem, Quote, QuoteFile, QuoteLine, Supplier
from ffe.schemas.quote import (
    ItemQuoteRead,
    QuoteCreate,
    QuoteFileAttach,
    QuoteFileRead,
    QuoteLineCreate,
    QuoteLineRead,
    QuoteLineUpdate,
    QuoteRead,
    QuoteUpdate,
)
from ffe.services.base import stamp
from ffe.services.file import get_file, unlink_if_orphan
from ffe.services.project import ensure_open, get_project
from ffe.services.project_item import (
    check_preconditions,
    get_item,
    price_json,
    resolve_fx,
    write_event,
)
from ffe.transitions import TERMINAL


def _err(field: str, message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail(field, message)])


# --- read -------------------------------------------------------------------------------------


def get_quote(session: Session, quote_id: int) -> Quote:
    quote = session.get(Quote, quote_id)
    if quote is None:
        raise NotFoundError("quote", quote_id)
    return quote


def get_line(session: Session, line_id: int) -> QuoteLine:
    line = session.get(QuoteLine, line_id)
    if line is None:
        raise NotFoundError("quote_line", line_id)
    return line


def list_quotes(session: Session, project_id: int) -> list[Quote]:
    get_project(session, project_id)
    return list(
        session.scalars(select(Quote).where(Quote.project_id == project_id).order_by(Quote.id))
    )


def _line_read(session: Session, quote: Quote, line: QuoteLine) -> QuoteLineRead:
    item = session.get(ProjectItem, line.project_item_id)
    assert item is not None
    net = money.net_unit_cents(line.unit_cost_cents, line.discount_bp)
    return QuoteLineRead(
        id=line.id,
        quote_id=line.quote_id,
        project_item_id=line.project_item_id,
        item_code=item.item_code,
        item_name=item.name,
        unit_cost_cents=line.unit_cost_cents,
        discount_bp=line.discount_bp,
        lead_time_weeks=line.lead_time_weeks,
        description=line.description,
        notes=line.notes,
        retained_at=line.retained_at,
        net_unit_cents=net,
        net_unit_eur_cents=money.net_unit_eur_cents(net, quote.fx_rate_micro),
        created_at=line.created_at,
        updated_at=line.updated_at,
    )


def to_read(session: Session, quote: Quote) -> QuoteRead:
    supplier = session.get(Supplier, quote.supplier_id)
    assert supplier is not None
    return QuoteRead(
        id=quote.id,
        project_id=quote.project_id,
        supplier_id=quote.supplier_id,
        supplier_name=supplier.name,
        reference=quote.reference,
        quoted_on=quote.quoted_on,
        valid_until=quote.valid_until,
        currency=quote.currency,
        fx_rate_micro=quote.fx_rate_micro,
        declined_at=quote.declined_at,
        notes=quote.notes,
        retained_count=sum(1 for line in quote.lines if line.retained_at is not None),
        lines=[_line_read(session, quote, line) for line in quote.lines],
        files=[
            QuoteFileRead(
                file_id=j.file_id,
                caption=j.caption,
                sha256=j.file.sha256,
                ext=j.file.ext,
                mime_type=j.file.mime_type,
                original_name=j.file.original_name,
                size_bytes=j.file.size_bytes,
            )
            for j in quote.files
        ],
        created_at=quote.created_at,
        updated_at=quote.updated_at,
    )


def item_quotes(session: Session, item_id: int) -> list[ItemQuoteRead]:
    """Comparison rows of every quote line for a project line, net and net EUR by money.py."""
    get_item(session, item_id)
    rows = session.execute(
        select(QuoteLine, Quote, Supplier)
        .join(Quote, Quote.id == QuoteLine.quote_id)
        .join(Supplier, Supplier.id == Quote.supplier_id)
        .where(QuoteLine.project_item_id == item_id)
        .order_by(Quote.declined_at.isnot(None), Quote.id)
    ).all()
    result: list[ItemQuoteRead] = []
    for line, quote, supplier in rows:
        net = money.net_unit_cents(line.unit_cost_cents, line.discount_bp)
        result.append(
            ItemQuoteRead(
                quote_id=quote.id,
                quote_line_id=line.id,
                supplier_id=supplier.id,
                supplier_name=supplier.name,
                reference=quote.reference,
                quoted_on=quote.quoted_on,
                valid_until=quote.valid_until,
                currency=quote.currency,
                fx_rate_micro=quote.fx_rate_micro,
                unit_cost_cents=line.unit_cost_cents,
                discount_bp=line.discount_bp,
                lead_time_weeks=line.lead_time_weeks,
                description=line.description,
                net_unit_cents=net,
                net_unit_eur_cents=money.net_unit_eur_cents(net, quote.fx_rate_micro),
                retained=line.retained_at is not None,
                declined=quote.declined_at is not None,
            )
        )
    return result


# --- write ------------------------------------------------------------------------------------


def _check_reference_free(
    session: Session, project_id: int, supplier_id: int, reference: str, exclude_id: int | None
) -> None:
    stmt = select(Quote.id).where(
        Quote.project_id == project_id,
        Quote.supplier_id == supplier_id,
        Quote.reference == reference,
    )
    if exclude_id is not None:
        stmt = stmt.where(Quote.id != exclude_id)
    if session.scalar(stmt) is not None:
        raise _err("reference", fr.QUOTE_REFERENCE_TAKEN)


def _check_item(session: Session, quote: Quote, item_id: int, index: int | None) -> ProjectItem:
    prefix = f"lines.{index}." if index is not None else ""
    item = session.get(ProjectItem, item_id)
    if item is None or item.project_id != quote.project_id:
        raise _err(f"{prefix}projectItemId", fr.QUOTE_ITEM_NOT_IN_PROJECT)
    if item.status in TERMINAL:
        raise _err(
            f"{prefix}projectItemId",
            fr.QUOTE_ITEM_TERMINAL.format(status=fr.ITEM_STATUS_LABELS[item.status].lower()),
        )
    if any(line.project_item_id == item_id for line in quote.lines):
        raise _err(f"{prefix}projectItemId", fr.QUOTE_ITEM_ALREADY_QUOTED)
    return item


def _new_line(quote: Quote, data: QuoteLineCreate, now: str) -> QuoteLine:
    return QuoteLine(
        quote_id=quote.id,
        project_item_id=data.project_item_id,
        project_id=quote.project_id,
        unit_cost_cents=data.unit_cost_cents,
        discount_bp=data.discount_bp,
        lead_time_weeks=data.lead_time_weeks,
        description=data.description,
        notes=data.notes,
        created_at=now,
        updated_at=now,
    )


def create_quote(session: Session, project_id: int, data: QuoteCreate, clock: Clock) -> Quote:
    with session.begin():
        ensure_open(get_project(session, project_id))
        supplier = session.get(Supplier, data.supplier_id)
        if supplier is None:
            raise _err("supplierId", fr.QUOTE_SUPPLIER_NOT_FOUND)
        if supplier.archived_at is not None:
            raise _err("supplierId", fr.QUOTE_SUPPLIER_ARCHIVED)
        _check_reference_free(session, project_id, supplier.id, data.reference, None)
        currency = data.currency or supplier.currency
        if currency == "EUR":
            if data.fx_rate_micro not in (None, money.EUR_RATE_MICRO):
                raise _err("fxRateMicro", fr.ITEM_FX_EUR_IS_ONE)
            fx = money.EUR_RATE_MICRO
        else:
            fx = resolve_fx(session, project_id, currency, data.fx_rate_micro)
        now = stamp(clock)
        quote = Quote(
            project_id=project_id,
            supplier_id=supplier.id,
            reference=data.reference,
            quoted_on=data.quoted_on,
            valid_until=data.valid_until,
            currency=currency,
            fx_rate_micro=fx,
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )
        session.add(quote)
        session.flush()
        for index, line in enumerate(data.lines):
            _check_item(session, quote, line.project_item_id, index)
            quote.lines.append(_new_line(quote, line, now))
    session.refresh(quote)
    return quote


def _editable_quote(session: Session, quote_id: int) -> Quote:
    quote = get_quote(session, quote_id)
    ensure_open(get_project(session, quote.project_id))
    return quote


def update_quote(session: Session, quote_id: int, data: QuoteUpdate, clock: Clock) -> Quote:
    with session.begin():
        quote = _editable_quote(session, quote_id)
        changes = data.model_dump(exclude_unset=True)
        reference = changes.get("reference", quote.reference)
        if reference != quote.reference:
            _check_reference_free(session, quote.project_id, quote.supplier_id, reference, quote.id)
        quoted_on = changes.get("quoted_on", quote.quoted_on)
        valid_until = changes.get("valid_until", quote.valid_until)
        if quoted_on and valid_until and valid_until < quoted_on:
            raise _err("validUntil", fr.QUOTE_VALID_BEFORE_QUOTED)
        if "fx_rate_micro" in changes and quote.currency == "EUR":
            if changes["fx_rate_micro"] != money.EUR_RATE_MICRO:
                raise _err("fxRateMicro", fr.ITEM_FX_EUR_IS_ONE)
        for field_name, value in changes.items():
            setattr(quote, field_name, value)
        quote.updated_at = stamp(clock)
    session.refresh(quote)
    return quote


def decline_quote(session: Session, quote_id: int, clock: Clock) -> Quote:
    with session.begin():
        quote = _editable_quote(session, quote_id)
        if quote.declined_at is None:
            quote.declined_at = quote.updated_at = stamp(clock)
    session.refresh(quote)
    return quote


def delete_quote(session: Session, quote_id: int) -> None:
    with session.begin():
        quote = _editable_quote(session, quote_id)
        if any(line.retained_at is not None for line in quote.lines):
            raise ConflictError(fr.QUOTE_HAS_RETAINED_LINE)
        session.delete(quote)


def add_line(session: Session, quote_id: int, data: QuoteLineCreate, clock: Clock) -> Quote:
    with session.begin():
        quote = _editable_quote(session, quote_id)
        _check_item(session, quote, data.project_item_id, None)
        quote.lines.append(_new_line(quote, data, stamp(clock)))
        quote.updated_at = stamp(clock)
    session.refresh(quote)
    return quote


def update_line(session: Session, line_id: int, data: QuoteLineUpdate, clock: Clock) -> Quote:
    with session.begin():
        line = get_line(session, line_id)
        quote = _editable_quote(session, line.quote_id)
        for field_name, value in data.model_dump(exclude_unset=True).items():
            setattr(line, field_name, value)
        line.updated_at = quote.updated_at = stamp(clock)
    session.refresh(quote)
    return quote


def delete_line(session: Session, line_id: int, clock: Clock) -> Quote:
    with session.begin():
        line = get_line(session, line_id)
        quote = _editable_quote(session, line.quote_id)
        if line.retained_at is not None:
            raise ConflictError(fr.QUOTE_LINE_RETAINED)
        quote.lines.remove(line)
        quote.updated_at = stamp(clock)
    session.refresh(quote)
    return quote


def retain_line(session: Session, line_id: int, clock: Clock) -> ProjectItem:
    """The transaction of ADR-0006: one retained line per item, values copied, journal written."""
    with session.begin():
        line = get_line(session, line_id)
        quote = _editable_quote(session, line.quote_id)
        if quote.declined_at is not None:
            raise ConflictError(fr.QUOTE_DECLINED)
        item = get_item(session, line.project_item_id)
        if item.status in TERMINAL:
            raise ConflictError(
                fr.ITEM_READ_ONLY_TERMINAL.format(status=fr.ITEM_STATUS_LABELS[item.status].lower())
            )
        if money.STATUS_RANK[item.status] >= money.STATUS_RANK["ordered"]:
            raise ConflictError(
                fr.QUOTE_RETAIN_AFTER_ORDER.format(
                    status=fr.ITEM_STATUS_LABELS[item.status].lower()
                )
            )
        now = stamp(clock)
        previous = session.scalar(
            select(QuoteLine).where(
                QuoteLine.project_item_id == item.id, QuoteLine.retained_at.isnot(None)
            )
        )
        if previous is not None and previous.id != line.id:
            previous.retained_at = None
            previous.updated_at = now
            session.flush()
        line.retained_at = line.updated_at = now
        supplier = session.get(Supplier, quote.supplier_id)
        assert supplier is not None
        before_price = price_json(item)
        before_fx = item.fx_rate_micro
        item.supplier_id = quote.supplier_id
        item.unit_cost_cents = line.unit_cost_cents
        item.discount_bp = line.discount_bp
        item.currency = quote.currency
        item.fx_rate_micro = quote.fx_rate_micro
        if line.lead_time_weeks is not None:
            item.lead_time_weeks = line.lead_time_weeks
        item.quoted_on = quote.quoted_on
        item.quote_valid_until = quote.valid_until
        item.quote_ref = quote.reference
        item.updated_at = now
        after_price = price_json(item)
        write_event(
            session,
            item,
            "quote",
            clock,
            old_value=before_price,
            new_value=after_price,
            note=fr.QUOTE_RETAINED_NOTE.format(reference=quote.reference, supplier=supplier.name),
        )
        if item.approved_at is not None:
            if json.loads(before_price) != json.loads(after_price):
                write_event(
                    session, item, "price", clock, old_value=before_price, new_value=after_price
                )
            if item.fx_rate_micro != before_fx:
                write_event(
                    session,
                    item,
                    "fx",
                    clock,
                    old_value=str(before_fx),
                    new_value=str(item.fx_rate_micro),
                )
        if money.STATUS_RANK[item.status] < money.STATUS_RANK["quoted"]:
            # Same transaction as the copy: a missing precondition (422) leaves the line untouched.
            check_preconditions(session, item, "quoted")
            previous = item.status
            item.status = "quoted"
            write_event(session, item, "status", clock, from_status=previous, to_status="quoted")
    session.refresh(item)
    return item


def attach_file(session: Session, quote_id: int, data: QuoteFileAttach, clock: Clock) -> Quote:
    with session.begin():
        quote = _editable_quote(session, quote_id)
        get_file(session, data.file_id)
        if any(j.file_id == data.file_id for j in quote.files):
            raise ConflictError(fr.QUOTE_FILE_ALREADY_ATTACHED)
        now = stamp(clock)
        quote.files.append(
            QuoteFile(file_id=data.file_id, caption=data.caption, created_at=now, updated_at=now)
        )
        quote.updated_at = now
    session.refresh(quote)
    return quote


def detach_file(
    session: Session, quote_id: int, file_id: int, files_dir: Any, clock: Clock
) -> Quote:
    with session.begin():
        quote = _editable_quote(session, quote_id)
        junction = next((j for j in quote.files if j.file_id == file_id), None)
        if junction is None:
            raise ConflictError(fr.QUOTE_FILE_NOT_ATTACHED)
        quote.files.remove(junction)
        quote.updated_at = stamp(clock)
    unlink_if_orphan(session, files_dir, file_id)
    session.refresh(quote)
    return quote
