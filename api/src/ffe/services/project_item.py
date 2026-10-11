"""`project_item` service: the business core (DATA_MODEL §4.11–4.15, §5, §7 ; ADR-0005).

Every write is one transaction and writes its journal row in the same transaction. Prices, rates,
quantities, product and placements are journaled once the line has been approved (D2.9 policy).
"""

import json
from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import (
    Category,
    Product,
    ProjectItem,
    ProjectItemEvent,
    ProjectItemFile,
    ProjectItemPlacement,
    Supplier,
    Zone,
)
from ffe.schemas.project_item import (
    ItemFileAttach,
    ItemFileUpdate,
    PlacementCreate,
    PlacementUpdate,
    ProjectItemCreate,
    ProjectItemUpdate,
    ReplaceProduct,
    StatusChange,
)
from ffe.services.base import stamp
from ffe.services.file import get_file, unlink_if_orphan
from ffe.services.project import ensure_open, get_project
from ffe.transitions import (
    NO_PRICE_KINDS,
    NO_PRODUCT_KINDS,
    NO_ZONE_KINDS,
    TERMINAL,
    check_transition,
    required_for,
)

RESOURCE = "project_item"
PIECE_UNITS = frozenset({"piece", "pair", "set", "lot", "roll"})
PRICE_FIELDS = ("unit_cost_cents", "currency", "discount_bp", "vat_rate_bp")
JOURNALED_FIELDS = PRICE_FIELDS + ("fx_rate_micro", "product_id")


def _err(field: str, message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail(field, message)])


def price_json(item: ProjectItem) -> str:
    return json.dumps(
        {
            "cost": item.unit_cost_cents,
            "currency": item.currency,
            "fx": item.fx_rate_micro,
            "discount": item.discount_bp,
            "vat": item.vat_rate_bp,
        },
        separators=(",", ":"),
    )


def write_event(
    session: Session,
    item: ProjectItem,
    kind: str,
    clock: Clock,
    *,
    from_status: str | None = None,
    to_status: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    note: str | None = None,
) -> None:
    session.add(
        ProjectItemEvent(
            project_item_id=item.id,
            kind=kind,
            from_status=from_status,
            to_status=to_status,
            old_value=old_value,
            new_value=new_value,
            changed_at=stamp(clock),
            note=note,
        )
    )


# --- read -------------------------------------------------------------------------------------


def get_item(session: Session, item_id: int) -> ProjectItem:
    item = session.get(ProjectItem, item_id)
    if item is None:
        raise NotFoundError(RESOURCE, item_id)
    return item


def list_items(
    session: Session,
    project_id: int,
    *,
    zone_id: int | None = None,
    status: str | None = None,
    category_id: int | None = None,
    supplier_id: int | None = None,
    kind: str | None = None,
    q: str | None = None,
) -> list[ProjectItem]:
    get_project(session, project_id)
    query = select(ProjectItem).where(ProjectItem.project_id == project_id)
    if status is not None:
        query = query.where(ProjectItem.status == status)
    if category_id is not None:
        query = query.where(ProjectItem.category_id == category_id)
    if supplier_id is not None:
        query = query.where(ProjectItem.supplier_id == supplier_id)
    if kind is not None:
        query = query.where(ProjectItem.kind == kind)
    if zone_id is not None:
        placed = select(ProjectItemPlacement.project_item_id).where(
            ProjectItemPlacement.zone_id == zone_id
        )
        query = query.where(ProjectItem.id.in_(placed))
    rows = list(session.scalars(query.order_by(ProjectItem.sort_order, ProjectItem.item_code)))
    if q and q.strip():
        from ffe.services.base import normalize_key

        needle = normalize_key(q)
        rows = [
            r
            for r in rows
            if needle in normalize_key(r.name) or needle in normalize_key(r.item_code)
        ]
    return rows


def list_events(session: Session, item_id: int) -> list[ProjectItemEvent]:
    get_item(session, item_id)
    return list(
        session.scalars(
            select(ProjectItemEvent)
            .where(ProjectItemEvent.project_item_id == item_id)
            .order_by(ProjectItemEvent.changed_at, ProjectItemEvent.id)
        )
    )


# --- codes (DATA_MODEL §7) --------------------------------------------------------------------


def level1_code(session: Session, category_id: int) -> str:
    category = session.get(Category, category_id)
    if category is None:
        raise _err("categoryId", fr.NOT_FOUND.format(resource="Catégorie", id=category_id))
    if category.parent_id is not None:
        parent = session.get(Category, category.parent_id)
        assert parent is not None and parent.code is not None
        return parent.code
    assert category.code is not None
    return category.code


def next_item_code(session: Session, project_id: int, prefix: str) -> str:
    """`<CAT>-NNN` from `code_sequence`, never decremented (upsert + RETURNING)."""
    value = session.execute(
        text(
            "INSERT INTO code_sequence (project_id, prefix, next_value) VALUES (:p, :x, 2) "
            "ON CONFLICT (project_id, prefix) DO UPDATE SET next_value = next_value + 1 "
            "RETURNING next_value - 1"
        ),
        {"p": project_id, "x": prefix},
    ).scalar_one()
    return f"{prefix}-{int(value):03d}"


def _check_code_free(session: Session, project_id: int, code: str, exclude_id: int | None) -> None:
    taken = session.scalar(
        select(ProjectItem.id).where(
            ProjectItem.project_id == project_id, ProjectItem.item_code == code
        )
    )
    if taken is not None and taken != exclude_id:
        raise _err("itemCode", fr.ITEM_CODE_TAKEN)


# --- defaults precedence (DATA_MODEL §6, création depuis un produit) ----------------------------


def _resolve_defaults(session: Session, project_id: int, data: ProjectItemCreate) -> dict[str, Any]:
    project = get_project(session, project_id)
    values = data.model_dump(exclude={"placements", "item_code"})
    product = None
    if data.product_id is not None:
        product = session.get(Product, data.product_id)
        if product is None:
            raise _err("productId", fr.NOT_FOUND.format(resource="Produit", id=data.product_id))
        values["category_id"] = values["category_id"] or product.category_id
        values["name"] = values["name"] or product.name
        values["unit"] = values["unit"] or product.unit
        for field in ("finish", "color", "materials"):
            values[field] = values[field] or getattr(product, field)
        values["supplier_id"] = values["supplier_id"] or product.supplier_id
        if values["lead_time_weeks"] is None:
            values["lead_time_weeks"] = product.lead_time_weeks
    if values["category_id"] is None:
        raise _err("categoryId", fr.ITEM_CATEGORY_REQUIRED)
    if not values["name"]:
        raise _err("name", fr.ITEM_NAME_REQUIRED)
    values["unit"] = values["unit"] or "piece"
    supplier = session.get(Supplier, values["supplier_id"]) if values["supplier_id"] else None
    if values["supplier_id"] and supplier is None:
        raise _err(
            "supplierId", fr.NOT_FOUND.format(resource="Fournisseur", id=values["supplier_id"])
        )
    if values["currency"] is None:
        if supplier is not None:
            values["currency"] = supplier.currency
        elif product is not None:
            values["currency"] = product.list_price_currency
        else:
            values["currency"] = "EUR"
    if values["unit_cost_cents"] is None:
        if product is not None and product.list_price_cents is not None:
            values["unit_cost_cents"] = money.list_price_ht_cents(
                product.list_price_cents, product.list_price_tax_mode, product.list_price_vat_bp
            )
        else:
            values["unit_cost_cents"] = 0
    if values["discount_bp"] is None:
        values["discount_bp"] = supplier.default_discount_bp if supplier is not None else 0
    if values["vat_rate_bp"] is None:
        values["vat_rate_bp"] = project.default_vat_bp
    values["fx_rate_micro"] = resolve_fx(
        session, project_id, values["currency"], values["fx_rate_micro"]
    )
    if data.kind == "existing":
        if values["unit_cost_cents"]:
            raise _err("unitCostCents", fr.ITEM_EXISTING_IS_FREE)
    return values


def resolve_fx(session: Session, project_id: int, currency: str, given: int | None) -> int:
    if currency == "EUR":
        if given not in (None, money.EUR_RATE_MICRO):
            raise _err("fxRateMicro", fr.ITEM_FX_EUR_IS_ONE)
        return money.EUR_RATE_MICRO
    if given is not None:
        return given
    last = session.scalar(
        select(ProjectItem.fx_rate_micro)
        .where(ProjectItem.project_id == project_id, ProjectItem.currency == currency)
        .order_by(ProjectItem.updated_at.desc(), ProjectItem.id.desc())
    )
    if last is None:
        raise _err("fxRateMicro", fr.ITEM_FX_REQUIRED)
    return int(last)


# --- placements -------------------------------------------------------------------------------


def _check_zone(session: Session, project_id: int, zone_id: int | None) -> Zone | None:
    if zone_id is None:
        return None
    zone = session.get(Zone, zone_id)
    if zone is None or zone.project_id != project_id:
        raise _err("zoneId", fr.PLACEMENT_ZONE_NOT_IN_PROJECT)
    if zone.archived_at is not None:
        raise _err("zoneId", fr.PLACEMENT_ZONE_ARCHIVED)
    return zone


def _check_qty(unit: str, qty_milli: int) -> None:
    if unit in PIECE_UNITS and qty_milli % money.MILLI_SCALE:
        raise _err("qtyMilli", fr.PLACEMENT_PIECE_QTY)


def _placement_pairs(session: Session, item: ProjectItem) -> list[tuple[int, int]]:
    pairs: list[tuple[int, int]] = []
    for placement in item.placements:
        multiplier = 1
        if placement.zone_id is not None:
            zone = session.get(Zone, placement.zone_id)
            multiplier = zone.multiplier if zone is not None else 1
        pairs.append((placement.qty_milli, multiplier))
    return pairs


def _placements_json(session: Session, item: ProjectItem) -> str:
    return json.dumps(
        [{"zone": p.zone_id, "qty": p.qty_milli} for p in item.placements], separators=(",", ":")
    )


def _journal_qty_if_approved(
    session: Session, item: ProjectItem, before: str, clock: Clock, note: str | None = None
) -> None:
    if item.approved_at is None:
        return
    session.flush()
    session.refresh(item)
    after = _placements_json(session, item)
    if after != before:
        write_event(session, item, "placement", clock, old_value=before, new_value=after, note=note)


def add_placement(
    session: Session, item_id: int, data: PlacementCreate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        _check_zone(session, item.project_id, data.zone_id)
        _check_qty(item.unit, data.qty_milli)
        if any(p.zone_id == data.zone_id for p in item.placements):
            raise _err("zoneId", fr.PLACEMENT_ZONE_TAKEN)
        before = _placements_json(session, item)
        now = stamp(clock)
        item.placements.append(
            ProjectItemPlacement(
                project_id=item.project_id,
                zone_id=data.zone_id,
                qty_milli=data.qty_milli,
                sort_order=data.sort_order,
                notes=data.notes,
                created_at=now,
                updated_at=now,
            )
        )
        item.updated_at = now
        _journal_qty_if_approved(session, item, before, clock)
    session.refresh(item)
    return item


def _placement(session: Session, placement_id: int) -> tuple[ProjectItem, ProjectItemPlacement]:
    placement = session.get(ProjectItemPlacement, placement_id)
    if placement is None:
        raise NotFoundError("placement", placement_id)
    item = _editable(session, placement.project_item_id)
    return item, placement


def update_placement(
    session: Session, placement_id: int, data: PlacementUpdate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item, placement = _placement(session, placement_id)
        changes = data.model_dump(exclude_unset=True)
        if "zone_id" in changes and changes["zone_id"] != placement.zone_id:
            _check_zone(session, item.project_id, changes["zone_id"])
            if any(
                p.id != placement.id and p.zone_id == changes["zone_id"] for p in item.placements
            ):
                raise _err("zoneId", fr.PLACEMENT_ZONE_TAKEN)
        if "qty_milli" in changes:
            _check_qty(item.unit, changes["qty_milli"])
        before = _placements_json(session, item)
        for field_name, value in changes.items():
            setattr(placement, field_name, value)
        placement.updated_at = item.updated_at = stamp(clock)
        _journal_qty_if_approved(session, item, before, clock)
    session.refresh(item)
    return item


def delete_placement(session: Session, placement_id: int, clock: Clock) -> ProjectItem:
    with session.begin():
        item, placement = _placement(session, placement_id)
        if len(item.placements) <= 1:
            raise ConflictError(fr.PLACEMENT_LAST_ONE)
        before = _placements_json(session, item)
        item.placements.remove(placement)
        item.updated_at = stamp(clock)
        _journal_qty_if_approved(session, item, before, clock)
    session.refresh(item)
    return item


# --- create / update / delete -----------------------------------------------------------------


def _editable(session: Session, item_id: int) -> ProjectItem:
    item = get_item(session, item_id)
    ensure_open(get_project(session, item.project_id))
    if item.status in TERMINAL:
        raise ConflictError(
            fr.ITEM_READ_ONLY_TERMINAL.format(status=fr.ITEM_STATUS_LABELS[item.status].lower())
        )
    return item


def create_item(
    session: Session, project_id: int, data: ProjectItemCreate, clock: Clock
) -> ProjectItem:
    with session.begin():
        ensure_open(get_project(session, project_id))
        values = _resolve_defaults(session, project_id, data)
        prefix = level1_code(session, values["category_id"])
        if data.item_code:
            _check_code_free(session, project_id, data.item_code, None)
            code = data.item_code
        else:
            code = next_item_code(session, project_id, prefix)
        placements = data.placements if data.placements is not None else [PlacementCreate()]
        if not placements:
            placements = [PlacementCreate()]
        seen: set[int | None] = set()
        for placement in placements:
            _check_zone(session, project_id, placement.zone_id)
            _check_qty(values["unit"], placement.qty_milli)
            if placement.zone_id in seen:
                raise _err("placements", fr.PLACEMENT_ZONE_TAKEN)
            seen.add(placement.zone_id)
        now = stamp(clock)
        item = ProjectItem(
            **values, project_id=project_id, item_code=code, created_at=now, updated_at=now
        )
        for placement in placements:
            item.placements.append(
                ProjectItemPlacement(
                    project_id=project_id,
                    zone_id=placement.zone_id,
                    qty_milli=placement.qty_milli,
                    sort_order=placement.sort_order,
                    notes=placement.notes,
                    created_at=now,
                    updated_at=now,
                )
            )
        session.add(item)
        session.flush()
        write_event(session, item, "created", clock, to_status="draft", new_value=price_json(item))
    session.refresh(item)
    return item


def update_item(
    session: Session, item_id: int, data: ProjectItemUpdate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        changes = data.model_dump(exclude_unset=True)
        if "on_hold" in changes:
            changes["on_hold"] = int(changes["on_hold"])
        if "item_code" in changes and changes["item_code"] != item.item_code:
            if item.status != "draft":
                raise _err("itemCode", fr.ITEM_CODE_IMMUTABLE)
            _check_code_free(session, item.project_id, changes["item_code"], item_id)
        if "product_id" in changes and changes["product_id"] is not None:
            if session.get(Product, changes["product_id"]) is None:
                raise _err(
                    "productId", fr.NOT_FOUND.format(resource="Produit", id=changes["product_id"])
                )
        if "supplier_id" in changes and changes["supplier_id"] is not None:
            if session.get(Supplier, changes["supplier_id"]) is None:
                raise _err(
                    "supplierId",
                    fr.NOT_FOUND.format(resource="Fournisseur", id=changes["supplier_id"]),
                )
        if "category_id" in changes and changes["category_id"] != item.category_id:
            prefix = level1_code(session, changes["category_id"])
            if item.status == "draft" and "item_code" not in changes:
                changes["item_code"] = next_item_code(session, item.project_id, prefix)
        kind = changes.get("kind", item.kind)
        cost = changes.get("unit_cost_cents", item.unit_cost_cents)
        if kind == "existing" and cost:
            if "unit_cost_cents" in changes:
                raise _err("unitCostCents", fr.ITEM_EXISTING_IS_FREE)
            changes["unit_cost_cents"] = 0
        currency = changes.get("currency", item.currency)
        fx_given = changes.get("fx_rate_micro")
        if "currency" in changes or "fx_rate_micro" in changes:
            if currency == "EUR":
                if fx_given not in (None, money.EUR_RATE_MICRO):
                    raise _err("fxRateMicro", fr.ITEM_FX_EUR_IS_ONE)
                changes["fx_rate_micro"] = money.EUR_RATE_MICRO
            elif fx_given is None and "currency" in changes:
                changes["fx_rate_micro"] = resolve_fx(session, item.project_id, currency, None)
        unit = changes.get("unit", item.unit)
        if unit in PIECE_UNITS and unit != item.unit:
            for placement in item.placements:
                _check_qty(unit, placement.qty_milli)
        before_price = price_json(item)
        before_fx = item.fx_rate_micro
        before_product = item.product_id
        for field_name, value in changes.items():
            setattr(item, field_name, value)
        item.updated_at = stamp(clock)
        if item.approved_at is not None:
            after_price = price_json(item)
            price_changed = any(
                f in changes and changes[f] != json.loads(before_price)[k]
                for f, k in zip(PRICE_FIELDS, ("cost", "currency", "discount", "vat"), strict=True)
            )
            if price_changed:
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
            if item.product_id != before_product:
                write_event(
                    session,
                    item,
                    "product",
                    clock,
                    old_value=str(before_product),
                    new_value=str(item.product_id),
                )
    session.refresh(item)
    return item


def delete_item(session: Session, item_id: int) -> None:
    """Physical deletion: draft with no event other than `created` (DATA_MODEL §5)."""
    with session.begin():
        item = get_item(session, item_id)
        ensure_open(get_project(session, item.project_id))
        others = session.scalar(
            select(func.count())
            .select_from(ProjectItemEvent)
            .where(ProjectItemEvent.project_item_id == item_id, ProjectItemEvent.kind != "created")
        )
        if item.status != "draft" or others:
            raise ConflictError(fr.ITEM_DELETE_ONLY_DRAFT)
        session.delete(item)


# --- status (DATA_MODEL §5) -------------------------------------------------------------------


def _was_ordered(session: Session, item_id: int) -> bool:
    row = session.scalar(
        select(ProjectItemEvent.id).where(
            ProjectItemEvent.project_item_id == item_id,
            ProjectItemEvent.kind == "status",
            ProjectItemEvent.to_status == "ordered",
        )
    )
    return row is not None


def check_preconditions(session: Session, item: ProjectItem, target: str) -> None:
    needs = required_for(target)
    details: list[ErrorDetail] = []
    if "name" in needs and not item.name:
        details.append(ErrorDetail("name", fr.ITEM_NEEDS_NAME))
    if "product" in needs and item.product_id is None and item.kind not in NO_PRODUCT_KINDS:
        details.append(ErrorDetail("productId", fr.ITEM_NEEDS_PRODUCT))
    if "zone" in needs and item.kind not in NO_ZONE_KINDS:
        if not any(p.zone_id is not None for p in item.placements):
            details.append(ErrorDetail("placements", fr.ITEM_NEEDS_ZONE))
    if "supplier" in needs and item.supplier_id is None and item.kind not in NO_PRICE_KINDS:
        details.append(ErrorDetail("supplierId", fr.ITEM_NEEDS_SUPPLIER))
    if "price" in needs and item.unit_cost_cents <= 0 and item.kind not in NO_PRICE_KINDS:
        details.append(ErrorDetail("unitCostCents", fr.ITEM_NEEDS_PRICE))
    if "order_ref" in needs and not item.order_ref:
        details.append(ErrorDetail("orderRef", fr.ITEM_NEEDS_ORDER_REF))
    if details:
        raise ValidationAppError(details)


def change_status(session: Session, item_id: int, data: StatusChange, clock: Clock) -> ProjectItem:
    with session.begin():
        item = get_item(session, item_id)
        ensure_open(get_project(session, item.project_id))
        verdict = check_transition(item.status, data.status, _was_ordered(session, item_id))
        if verdict is not None:
            raise ConflictError(fr.TRANSITION_MESSAGES[verdict])
        note_required = (
            data.status == "cancelled"
            or item.status == "cancelled"
            or (item.status == "approved" and money.STATUS_RANK[data.status] < money.APPROVED_RANK)
        )
        if note_required and not (data.note and data.note.strip()):
            raise _err("note", fr.ITEM_NOTE_REQUIRED)
        check_preconditions(session, item, data.status)
        previous = item.status
        item.status = data.status
        item.updated_at = stamp(clock)
        write_event(
            session,
            item,
            "status",
            clock,
            from_status=previous,
            to_status=data.status,
            note=data.note,
        )
        if data.status == "approved":
            amounts = money.line_amounts(
                item.unit_cost_cents,
                item.discount_bp,
                item.fx_rate_micro,
                _placement_pairs(session, item),
                item.kind,
            )
            item.approved_at = item.updated_at
            item.approved_unit_net_cents = amounts.net_unit_eur_cents
            item.approved_total_qty_milli = amounts.total_qty_milli
            write_event(
                session,
                item,
                "approval",
                clock,
                from_status=previous,
                to_status="approved",
                new_value=json.dumps(
                    {"unitNetEur": amounts.net_unit_eur_cents, "qty": amounts.total_qty_milli},
                    separators=(",", ":"),
                ),
            )
    session.refresh(item)
    return item


def replace_product(
    session: Session, item_id: int, data: ReplaceProduct, clock: Clock
) -> ProjectItem:
    """New line takes the code and the placements; the old one becomes `<code>.R1` / `replaced`."""
    with session.begin():
        old = get_item(session, item_id)
        ensure_open(get_project(session, old.project_id))
        if old.status != "approved":
            raise ConflictError(fr.ITEM_REPLACE_ONLY_APPROVED)
        product = session.get(Product, data.product_id)
        if product is None:
            raise _err("productId", fr.NOT_FOUND.format(resource="Produit", id=data.product_id))
        supplier_id = data.supplier_id or product.supplier_id or old.supplier_id
        supplier = session.get(Supplier, supplier_id) if supplier_id else None
        currency = data.currency or (supplier.currency if supplier else product.list_price_currency)
        cost = data.unit_cost_cents
        if cost is None:
            cost = (
                money.list_price_ht_cents(
                    product.list_price_cents, product.list_price_tax_mode, product.list_price_vat_bp
                )
                if product.list_price_cents is not None
                else 0
            )
        discount = (
            data.discount_bp
            if data.discount_bp is not None
            else (supplier.default_discount_bp if supplier else 0)
        )
        fx = resolve_fx(session, old.project_id, currency, data.fx_rate_micro)
        now = stamp(clock)
        code = old.item_code
        suffix = 1
        while session.scalar(
            select(ProjectItem.id).where(
                ProjectItem.project_id == old.project_id,
                ProjectItem.item_code == f"{code}.R{suffix}",
            )
        ):
            suffix += 1
        old.item_code = f"{code}.R{suffix}"
        session.flush()
        new = ProjectItem(
            project_id=old.project_id,
            item_code=code,
            category_id=product.category_id,
            product_id=product.id,
            supplier_id=supplier_id,
            name=product.name,
            client_description=old.client_description,
            kind=old.kind,
            unit=product.unit,
            finish=product.finish,
            color=product.color,
            materials=product.materials,
            unit_cost_cents=cost,
            currency=currency,
            fx_rate_micro=fx,
            discount_bp=discount,
            vat_rate_bp=old.vat_rate_bp,
            lead_time_weeks=product.lead_time_weeks,
            required_on_site=old.required_on_site,
            status="specified",
            sort_order=old.sort_order,
            internal_notes=old.internal_notes,
            created_at=now,
            updated_at=now,
        )
        for placement in list(old.placements):
            new.placements.append(
                ProjectItemPlacement(
                    project_id=old.project_id,
                    zone_id=placement.zone_id,
                    qty_milli=placement.qty_milli,
                    sort_order=placement.sort_order,
                    notes=placement.notes,
                    created_at=now,
                    updated_at=now,
                )
            )
            old.placements.remove(placement)
        session.add(new)
        session.flush()
        previous = old.status
        old.status = "replaced"
        old.replaced_by_id = new.id
        old.updated_at = now
        write_event(
            session,
            old,
            "status",
            clock,
            from_status=previous,
            to_status="replaced",
            new_value=str(new.id),
            note=data.note,
        )
        write_event(
            session,
            new,
            "created",
            clock,
            to_status="specified",
            new_value=price_json(new),
            note=f"remplace {old.item_code}",
        )
    session.refresh(new)
    return new


def refresh_from_catalogue(session: Session, item_id: int, clock: Clock) -> ProjectItem:
    """D7.4: explicit re-copy of the catalogue price (never automatic), journaled when approved."""
    with session.begin():
        item = _editable(session, item_id)
        if item.product_id is None:
            raise ConflictError(fr.ITEM_NO_PRODUCT_TO_REFRESH)
        product = session.get(Product, item.product_id)
        assert product is not None
        before = price_json(item)
        if product.list_price_cents is not None:
            item.unit_cost_cents = money.list_price_ht_cents(
                product.list_price_cents, product.list_price_tax_mode, product.list_price_vat_bp
            )
            if product.list_price_currency != item.currency:
                item.currency = product.list_price_currency
                item.fx_rate_micro = resolve_fx(session, item.project_id, item.currency, None)
        item.lead_time_weeks = (
            product.lead_time_weeks if product.lead_time_weeks is not None else item.lead_time_weeks
        )
        item.updated_at = stamp(clock)
        if item.approved_at is not None and price_json(item) != before:
            write_event(
                session,
                item,
                "price",
                clock,
                old_value=before,
                new_value=price_json(item),
                note="catalogue",
            )
    session.refresh(item)
    return item


# --- files (same shape as product_file) --------------------------------------------------------


def _junction(item: ProjectItem, file_id: int) -> ProjectItemFile:
    for junction in item.files:
        if junction.file_id == file_id:
            return junction
    raise ConflictError(fr.PRODUCT_FILE_NOT_ATTACHED)


def attach_file(session: Session, item_id: int, data: ItemFileAttach, clock: Clock) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        get_file(session, data.file_id)
        if any(j.file_id == data.file_id for j in item.files):
            raise ConflictError(fr.PRODUCT_FILE_ALREADY_ATTACHED)
        if data.is_primary and data.kind != "image":
            raise _err("isPrimary", fr.PRODUCT_FILE_PRIMARY_NOT_IMAGE)
        if data.is_primary:
            for junction in item.files:
                junction.is_primary = 0
            session.flush()
        now = stamp(clock)
        item.files.append(
            ProjectItemFile(
                file_id=data.file_id,
                kind=data.kind,
                is_primary=int(data.is_primary),
                caption=data.caption,
                sort_order=data.sort_order,
                created_at=now,
                updated_at=now,
            )
        )
        item.updated_at = now
    session.refresh(item)
    return item


def update_file(
    session: Session, item_id: int, file_id: int, data: ItemFileUpdate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        junction = _junction(item, file_id)
        changes = data.model_dump(exclude_unset=True)
        kind = changes.get("kind", junction.kind)
        is_primary = changes.get("is_primary", bool(junction.is_primary))
        if is_primary and kind != "image":
            raise _err("isPrimary", fr.PRODUCT_FILE_PRIMARY_NOT_IMAGE)
        if is_primary:
            for other in item.files:
                if other.file_id != file_id:
                    other.is_primary = 0
            session.flush()
        for field_name, value in changes.items():
            setattr(junction, field_name, int(value) if field_name == "is_primary" else value)
        junction.updated_at = item.updated_at = stamp(clock)
    session.refresh(item)
    return item


def detach_file(
    session: Session, item_id: int, file_id: int, files_dir: Path, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        item.files.remove(_junction(item, file_id))
        item.updated_at = stamp(clock)
    unlink_if_orphan(session, files_dir, file_id)
    session.refresh(item)
    return item


# --- summary (money.py only; budgets join at step 8) -----------------------------------------


def summary(session: Session, project_id: int, today: date) -> dict[str, Any]:
    get_project(session, project_id)
    items = list_items(session, project_id)
    zones = {z.id: z for z in session.scalars(select(Zone).where(Zone.project_id == project_id))}
    lines: list[dict[str, Any]] = []
    zone_totals: dict[int | None, int] = {}
    vat_lines: list[tuple[int, int]] = []
    specified = approved = ose = 0
    for item in items:
        pairs = [
            (p.qty_milli, zones[p.zone_id].multiplier if p.zone_id in zones else 1)
            for p in item.placements
        ]
        amounts = money.line_amounts(
            item.unit_cost_cents, item.discount_bp, item.fx_rate_micro, pairs, item.kind
        )
        counted = money.is_counted(item.status)
        amount_counted = money.is_amount_counted(item.status, item.kind)
        approved_line = (
            money.approved_cents(item.approved_unit_net_cents, item.approved_total_qty_milli)
            if item.approved_unit_net_cents is not None
            and item.approved_total_qty_milli is not None
            else None
        )
        if amount_counted:
            if item.kind == "ose":
                ose += amounts.total_ht_cents
            else:
                specified += amounts.total_ht_cents
                vat_lines.append((amounts.total_ht_cents, item.vat_rate_bp))
                if approved_line is not None and money.is_approved_or_later(item.status):
                    approved += approved_line
            if item.kind != "ose":
                for placement in item.placements:
                    multiplier = (
                        zones[placement.zone_id].multiplier if placement.zone_id in zones else 1
                    )
                    share = money.placement_ht_cents(
                        amounts.net_unit_eur_cents, placement.qty_milli, multiplier
                    )
                    zone_totals[placement.zone_id] = zone_totals.get(placement.zone_id, 0) + share
        order_by = (
            money.order_by(date.fromisoformat(item.required_on_site), item.lead_time_weeks)
            if item.required_on_site
            and item.kind != "fee"
            and money.STATUS_RANK[item.status] < money.STATUS_RANK["ordered"]
            and counted
            else None
        )
        order_overdue = order_by is not None and order_by <= today and not item.on_hold
        lines.append(
            {
                "project_item_id": item.id,
                "item_code": item.item_code,
                "status": item.status,
                "kind": item.kind,
                "counted": counted,
                "amount_counted": amount_counted,
                "total_qty_milli": amounts.total_qty_milli,
                "net_unit_cents": amounts.net_unit_cents,
                "net_unit_eur_cents": amounts.net_unit_eur_cents,
                "total_ht_cents": amounts.total_ht_cents,
                "approved_cents": approved_line,
                "order_by": order_by.isoformat() if order_by else None,
                "order_overdue": order_overdue,
            }
        )
    vat = money.vat_totals(vat_lines)
    zone_rows: list[dict[str, Any]] = [
        {
            "zone_id": z.id,
            "zone_code": z.code,
            "zone_name": z.name,
            "multiplier": z.multiplier,
            "specified_cents": zone_totals.get(z.id, 0),
        }
        for z in sorted(zones.values(), key=lambda z: (z.sort_order, z.id))
        if z.archived_at is None or zone_totals.get(z.id)
    ]
    if zone_totals.get(None):
        zone_rows.append(
            {
                "zone_id": None,
                "zone_code": None,
                "zone_name": "Non affecté",
                "multiplier": 1,
                "specified_cents": zone_totals[None],
            }
        )
    return {
        "project_id": project_id,
        "lines": lines,
        "zones": zone_rows,
        "specified_cents": specified,
        "approved_cents": approved,
        "ose_cents": ose,
        "vat_by_rate_bp": vat.vat_by_rate_bp,
        "vat_cents": vat.vat_cents,
        "ttc_cents": vat.ttc_cents,
    }
