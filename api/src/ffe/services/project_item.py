"""`project_item` service: the business core (DATA_MODEL §4.11–4.15, §5, §7 ; ADR-0013).

Every write is one transaction and writes its journal row in the same transaction. Status, price
(cost, discount, currency, rate), product and placement changes are always journaled.
"""

import json
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
    Location,
    Product,
    ProjectItem,
    ProjectItemEvent,
    ProjectItemFile,
    ProjectItemPlacement,
    Supplier,
)
from ffe.schemas.project_item import (
    ItemFileAttach,
    ItemFileUpdate,
    PlacementCreate,
    PlacementUpdate,
    ProjectItemCreate,
    ProjectItemUpdate,
    StatusChange,
)
from ffe.services.base import normalize_key, stamp
from ffe.services.file import get_file, unlink_if_orphan
from ffe.services.product import find_twin
from ffe.services.project import ensure_open, get_project

RESOURCE = "project_item"
FEE_PREFIX = "FR"
PRICE_FIELDS = ("unit_cost_cents", "currency", "fx_rate_micro", "discount_bp")
# Fields of the spec sheet copied from a catalogue product when the line does not give them.
COPIED_FROM_PRODUCT = (
    "name",
    "category_id",
    "reference",
    "supplier_id",
    "finish",
    "dimensions",
    "source_url",
)


def _err(field: str, message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail(field, message)])


def _reloaded(session: Session, item: ProjectItem) -> ProjectItem:
    """Reloads collections after the commit, in a closed read transaction (so that the next
    service call on the same session can open its own)."""
    with session.begin():
        session.refresh(item)
    return item


def price_json(item: ProjectItem) -> str:
    return json.dumps(
        {
            "cost": item.unit_cost_cents,
            "currency": item.currency,
            "fx": item.fx_rate_micro,
            "discount": item.discount_bp,
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
    location_id: int | None = None,
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
    if location_id is not None:
        placed = select(ProjectItemPlacement.project_item_id).where(
            ProjectItemPlacement.location_id == location_id
        )
        query = query.where(ProjectItem.id.in_(placed))
    rows = list(session.scalars(query.order_by(ProjectItem.sort_order, ProjectItem.item_code)))
    if q and q.strip():
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


def type_code(session: Session, category_id: int) -> str:
    category = session.get(Category, category_id)
    if category is None:
        raise _err("categoryId", fr.NOT_FOUND.format(resource="Type de produit", id=category_id))
    if category.archived_at is not None:
        raise _err("categoryId", fr.CATEGORY_MUST_BE_ACTIVE)
    return category.code


def location_code_of(session: Session, location_id: int | None) -> str:
    """Location code used as the first segment of an item code; '' without a location."""
    if location_id is None:
        return ""
    location = session.get(Location, location_id)
    return location.code.upper() if location is not None else ""


def next_item_code(session: Session, project_id: int, location_code: str, prefix: str) -> str:
    """`<LOC>-<TYPE>-NN` (or `<TYPE>-NN` without a location) from `item_code_sequence`, never
    decremented (upsert + RETURNING), ADR-0012/0013."""
    value = session.execute(
        text(
            "INSERT INTO item_code_sequence (project_id, location_code, prefix, next_value) "
            "VALUES (:p, :z, :x, 2) "
            "ON CONFLICT (project_id, location_code, prefix) "
            "DO UPDATE SET next_value = next_value + 1 "
            "RETURNING next_value - 1"
        ),
        {"p": project_id, "z": location_code, "x": prefix},
    ).scalar_one()
    head = f"{location_code}-" if location_code else ""
    return f"{head}{prefix}-{int(value):02d}"


def _check_code_free(session: Session, project_id: int, code: str, exclude_id: int | None) -> None:
    taken = session.scalar(
        select(ProjectItem.id).where(
            ProjectItem.project_id == project_id, ProjectItem.item_code == code
        )
    )
    if taken is not None and taken != exclude_id:
        raise _err("itemCode", fr.ITEM_CODE_TAKEN)


# --- references and defaults (création depuis le catalogue ou libre) --------------------------


def _check_reference(
    session: Session, model: Any, field: str, value: int | None, label: str
) -> Any:
    if value is None:
        return None
    entity = session.get(model, value)
    if entity is None:
        raise _err(field, fr.NOT_FOUND.format(resource=label, id=value))
    if getattr(entity, "archived_at", None) is not None:
        raise _err(field, fr.ARCHIVED_READ_ONLY.format(resource=label, id=value))
    return entity


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


def _resolve_defaults(
    session: Session, project_id: int, data: ProjectItemCreate, now: str
) -> dict[str, Any]:
    values = data.model_dump(exclude={"placements", "item_code", "add_to_catalogue"})
    if data.kind == "fee":
        if data.category_id is not None or data.product_id is not None or data.placements:
            raise _err("kind", fr.ITEM_FEE_HAS_NO_TYPE)
        if data.supplier_id is None:
            raise _err("supplierId", fr.ITEM_FEE_NEEDS_SUPPLIER)
    product = _check_reference(session, Product, "productId", data.product_id, "Produit")
    if product is not None:
        for field in COPIED_FROM_PRODUCT:
            if values[field] in (None, ""):
                values[field] = getattr(product, field)
        if values["unit_cost_cents"] is None and product.list_price_cents is not None:
            values["unit_cost_cents"] = product.list_price_cents
            values["currency"] = values["currency"] or product.currency
    if data.kind == "product" and values["category_id"] is None:
        raise _err("categoryId", fr.ITEM_CATEGORY_REQUIRED)
    _check_reference(session, Category, "categoryId", values["category_id"], "Type de produit")
    if not values["name"]:
        raise _err("name", fr.ITEM_NAME_REQUIRED)
    supplier = _check_reference(
        session, Supplier, "supplierId", values["supplier_id"], "Fournisseur"
    )
    if values["currency"] is None:
        values["currency"] = supplier.currency if supplier is not None else "EUR"
    if values["unit_cost_cents"] is None:
        values["unit_cost_cents"] = 0
    if values["discount_bp"] is None:
        values["discount_bp"] = supplier.default_discount_bp if supplier is not None else 0
    values["fx_rate_micro"] = resolve_fx(
        session, project_id, values["currency"], values["fx_rate_micro"]
    )
    if data.kind == "product" and product is None and data.add_to_catalogue:
        values["product_id"] = _catalogue_product(session, values, now).id
    return values


def _catalogue_product(session: Session, values: dict[str, Any], now: str) -> Product:
    """ADR-0013: a free article joins the catalogue — the active twin (supplier + reference)
    if there is one, else a new product built from the sheet."""
    twin = find_twin(session, values["supplier_id"], values["reference"])
    if twin is not None:
        return twin
    product = Product(
        name=values["name"],
        category_id=values["category_id"],
        reference=values["reference"],
        supplier_id=values["supplier_id"],
        list_price_cents=values["unit_cost_cents"] or None,
        currency=values["currency"],
        dimensions=values["dimensions"],
        finish=values["finish"],
        source_url=values["source_url"],
        created_at=now,
        updated_at=now,
    )
    session.add(product)
    session.flush()
    return product


# --- placements -------------------------------------------------------------------------------


def _check_location(session: Session, project_id: int, location_id: int | None) -> Location | None:
    if location_id is None:
        return None
    location = session.get(Location, location_id)
    if location is None or location.project_id != project_id:
        raise _err("locationId", fr.PLACEMENT_LOCATION_NOT_IN_PROJECT)
    if location.archived_at is not None:
        raise _err("locationId", fr.PLACEMENT_LOCATION_ARCHIVED)
    return location


def placement_pairs(session: Session, item: ProjectItem) -> list[tuple[int, int]]:
    """`(qty_milli, multiplier)` per placement; a fee line counts once."""
    if item.kind == "fee":
        return [(money.MILLI_SCALE, 1)]
    pairs: list[tuple[int, int]] = []
    for placement in item.placements:
        multiplier = 1
        if placement.location_id is not None:
            location = session.get(Location, placement.location_id)
            multiplier = location.multiplier if location is not None else 1
        pairs.append((placement.qty_milli, multiplier))
    return pairs


def _placements_json(item: ProjectItem) -> str:
    return json.dumps(
        [{"location": p.location_id, "qty": p.qty_milli} for p in item.placements],
        separators=(",", ":"),
    )


def _journal_placements(session: Session, item: ProjectItem, before: str, clock: Clock) -> None:
    session.flush()
    session.refresh(item)
    after = _placements_json(item)
    if after != before:
        write_event(session, item, "placement", clock, old_value=before, new_value=after)


def _editable(session: Session, item_id: int) -> ProjectItem:
    item = get_item(session, item_id)
    ensure_open(get_project(session, item.project_id))
    return item


def add_placement(
    session: Session, item_id: int, data: PlacementCreate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        if item.kind == "fee":
            raise ConflictError(fr.PLACEMENT_ON_FEE)
        _check_location(session, item.project_id, data.location_id)
        if any(p.location_id == data.location_id for p in item.placements):
            raise _err("locationId", fr.PLACEMENT_LOCATION_TAKEN)
        before = _placements_json(item)
        now = stamp(clock)
        item.placements.append(
            ProjectItemPlacement(
                project_id=item.project_id,
                location_id=data.location_id,
                qty_milli=data.qty_milli,
                sort_order=data.sort_order,
                created_at=now,
                updated_at=now,
            )
        )
        item.updated_at = now
        _journal_placements(session, item, before, clock)
    return _reloaded(session, item)


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
        if "location_id" in changes and changes["location_id"] != placement.location_id:
            _check_location(session, item.project_id, changes["location_id"])
            if any(
                p.id != placement.id and p.location_id == changes["location_id"]
                for p in item.placements
            ):
                raise _err("locationId", fr.PLACEMENT_LOCATION_TAKEN)
        before = _placements_json(item)
        for field_name, value in changes.items():
            setattr(placement, field_name, value)
        placement.updated_at = item.updated_at = stamp(clock)
        _journal_placements(session, item, before, clock)
    return _reloaded(session, item)


def delete_placement(session: Session, placement_id: int, clock: Clock) -> ProjectItem:
    with session.begin():
        item, placement = _placement(session, placement_id)
        if len(item.placements) <= 1:
            raise ConflictError(fr.PLACEMENT_LAST_ONE)
        before = _placements_json(item)
        item.placements.remove(placement)
        item.updated_at = stamp(clock)
        _journal_placements(session, item, before, clock)
    return _reloaded(session, item)


# --- create / update / delete -----------------------------------------------------------------


def create_item(
    session: Session, project_id: int, data: ProjectItemCreate, clock: Clock
) -> ProjectItem:
    with session.begin():
        ensure_open(get_project(session, project_id))
        now = stamp(clock)
        values = _resolve_defaults(session, project_id, data, now)
        product = session.get(Product, values["product_id"]) if values["product_id"] else None
        placements: list[PlacementCreate] = []
        if data.kind == "product":
            placements = data.placements or [PlacementCreate()]
        seen: set[int | None] = set()
        for placement in placements:
            _check_location(session, project_id, placement.location_id)
            if placement.location_id in seen:
                raise _err("placements", fr.PLACEMENT_LOCATION_TAKEN)
            seen.add(placement.location_id)
        if data.item_code:
            _check_code_free(session, project_id, data.item_code, None)
            code = data.item_code
        elif data.kind == "fee":
            code = next_item_code(session, project_id, "", FEE_PREFIX)
        else:
            prefix = type_code(session, values["category_id"])
            first = placements[0].location_id if placements else None
            code = next_item_code(session, project_id, location_code_of(session, first), prefix)
        item = ProjectItem(
            **values, project_id=project_id, item_code=code, created_at=now, updated_at=now
        )
        for placement in placements:
            item.placements.append(
                ProjectItemPlacement(
                    project_id=project_id,
                    location_id=placement.location_id,
                    qty_milli=placement.qty_milli,
                    sort_order=placement.sort_order,
                    created_at=now,
                    updated_at=now,
                )
            )
        if product is not None:
            # The catalogue photo becomes the article's own (same file, new junction); it may diverge later.
            for junction in product.files:
                if junction.is_primary:
                    item.files.append(
                        ProjectItemFile(
                            file_id=junction.file_id,
                            kind="image",
                            is_primary=1,
                            caption=junction.caption,
                            created_at=now,
                            updated_at=now,
                        )
                    )
        session.add(item)
        session.flush()
        note = (
            fr.ITEM_PRODUCT_LINKED_NOTE.format(id=item.product_id)
            if item.product_id is not None and data.product_id is None
            else None
        )
        write_event(
            session,
            item,
            "created",
            clock,
            to_status="to_quote",
            new_value=price_json(item),
            note=note,
        )
    return _reloaded(session, item)


def update_item(
    session: Session, item_id: int, data: ProjectItemUpdate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        changes = data.model_dump(exclude_unset=True)
        if "item_code" in changes and changes["item_code"] != item.item_code:
            if item.status != "to_quote":
                raise _err("itemCode", fr.ITEM_CODE_IMMUTABLE)
            _check_code_free(session, item.project_id, changes["item_code"], item_id)
        if item.kind == "fee":
            if changes.get("category_id") is not None or changes.get("product_id") is not None:
                raise _err("kind", fr.ITEM_FEE_HAS_NO_TYPE)
            if "supplier_id" in changes and changes["supplier_id"] is None:
                raise _err("supplierId", fr.ITEM_FEE_NEEDS_SUPPLIER)
        elif "category_id" in changes and changes["category_id"] is None:
            raise _err("categoryId", fr.ITEM_CATEGORY_REQUIRED)
        _check_reference(session, Product, "productId", changes.get("product_id"), "Produit")
        _check_reference(session, Supplier, "supplierId", changes.get("supplier_id"), "Fournisseur")
        if (
            "category_id" in changes
            and changes["category_id"] is not None
            and changes["category_id"] != item.category_id
        ):
            prefix = type_code(session, changes["category_id"])
            if item.status == "to_quote" and "item_code" not in changes:
                first = item.placements[0].location_id if item.placements else None
                changes["item_code"] = next_item_code(
                    session, item.project_id, location_code_of(session, first), prefix
                )
        currency = changes.get("currency", item.currency)
        fx_given = changes.get("fx_rate_micro")
        if "currency" in changes or "fx_rate_micro" in changes:
            if currency == "EUR":
                if fx_given not in (None, money.EUR_RATE_MICRO):
                    raise _err("fxRateMicro", fr.ITEM_FX_EUR_IS_ONE)
                changes["fx_rate_micro"] = money.EUR_RATE_MICRO
            elif fx_given is None and "currency" in changes:
                changes["fx_rate_micro"] = resolve_fx(session, item.project_id, currency, None)
        before_price = price_json(item)
        before_product = item.product_id
        for field_name, value in changes.items():
            setattr(item, field_name, value)
        item.updated_at = stamp(clock)
        after_price = price_json(item)
        if after_price != before_price:
            write_event(
                session, item, "price", clock, old_value=before_price, new_value=after_price
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
    return _reloaded(session, item)


def delete_item(session: Session, item_id: int) -> None:
    """Physical deletion: « à chiffrer » with no event other than `created` (DATA_MODEL §5)."""
    with session.begin():
        item = get_item(session, item_id)
        ensure_open(get_project(session, item.project_id))
        others = session.scalar(
            select(func.count())
            .select_from(ProjectItemEvent)
            .where(ProjectItemEvent.project_item_id == item_id, ProjectItemEvent.kind != "created")
        )
        if item.status != "to_quote" or others:
            raise ConflictError(fr.ITEM_DELETE_ONLY_NEW)
        session.delete(item)


# --- status (DATA_MODEL §5) -------------------------------------------------------------------


def change_status(session: Session, item_id: int, data: StatusChange, clock: Clock) -> ProjectItem:
    """Free among the seven statuses (ADR-0013), journaled; the note is optional."""
    with session.begin():
        item = _editable(session, item_id)
        if item.status == data.status:
            raise ConflictError(fr.ITEM_SAME_STATUS)
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
            note=data.note.strip() if data.note and data.note.strip() else None,
        )
    return _reloaded(session, item)


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
    return _reloaded(session, item)


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
    return _reloaded(session, item)


def detach_file(
    session: Session, item_id: int, file_id: int, files_dir: Path, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _editable(session, item_id)
        item.files.remove(_junction(item, file_id))
        item.updated_at = stamp(clock)
    unlink_if_orphan(session, files_dir, file_id)
    return _reloaded(session, item)
