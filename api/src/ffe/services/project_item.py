"""`project_item` service: the business core (DATA_MODEL §4.11–4.15, §5, §7 ; ADR-0013).

Every write is one transaction and writes its journal row in the same transaction. Status, price
(cost, discount, currency, rate) and placement changes are always journaled.
"""

import json
from pathlib import Path
from typing import Any

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import (
    Category,
    Location,
    ProjectItem,
    ProjectItemEvent,
    ProjectItemFile,
    ProjectItemPlacement,
    Supplier,
)
from ffe.schemas.project_item import (
    FileSave,
    ItemFileAttach,
    ItemFileUpdate,
    ItemSave,
    OptionAttach,
    PlacementCreate,
    PlacementSave,
    PlacementUpdate,
    ProjectItemCreate,
    ProjectItemUpdate,
    StatusChange,
    code_label,
)
from ffe.services.base import normalize_key, stamp
from ffe.services.choice import check_code
from ffe.services.file import get_file, unlink_if_orphan
from ffe.services.project import ensure_open, get_project

RESOURCE = "project_item"
FEE_PREFIX = "FR"


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
    if kind == "placement" and item.option_of_id is None:
        # The options show the base's placements and codes (ADR-0021): their sheets change too,
        # so they are journaled and dated (they take the next indice).
        for option in session.scalars(
            select(ProjectItem).where(ProjectItem.option_of_id == item.id)
        ):
            option.updated_at = stamp(clock)
            session.add(
                ProjectItemEvent(
                    project_item_id=option.id,
                    kind="other",
                    changed_at=stamp(clock),
                    note=fr.OPTION_BASE_CHANGED_NOTE,
                )
            )
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
    rows = list(session.scalars(query))
    rows.sort(key=lambda r: (r.sort_order, code_label(r)))
    if q and q.strip():
        needle = normalize_key(q)
        rows = [
            r
            for r in rows
            if needle in normalize_key(r.name) or needle in normalize_key(code_label(r))
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


def _number(code: str, head: str) -> int | None:
    """Number of `code` in the series `head` (`CHA-LUD-`, `LUD-`, `FR-`), None outside it."""
    rest = code[len(head) :] if code.startswith(head) else ""
    # Only canonical numbers belong to the series (`01`…`99`, `100`…): a hand-written fee code such
    # as `FR-1` or `FR-00` stays outside, so closing up a series never collides with it.
    if not rest.isdigit() or int(rest) < 1 or rest != f"{int(rest):02d}":
        return None
    return int(rest)


def _series_head(location_code: str, prefix: str) -> str:
    return f"{location_code}-{prefix}-" if location_code else f"{prefix}-"


def _series(session: Session, project_id: int, head: str) -> list[tuple[int, Any]]:
    """`(number, holder)` of the codes of a series: placements, or fee lines for `FR-`."""
    session.flush()
    found: list[tuple[int, Any]] = []
    if head == f"{FEE_PREFIX}-":
        for item in session.scalars(
            select(ProjectItem).where(
                ProjectItem.project_id == project_id, ProjectItem.item_code.is_not(None)
            )
        ):
            if (n := _number(item.item_code or "", head)) is not None:
                found.append((n, item))
    else:
        for placement in session.scalars(
            select(ProjectItemPlacement).where(ProjectItemPlacement.project_id == project_id)
        ):
            if (n := _number(placement.code, head)) is not None:
                found.append((n, placement))
    return sorted(found, key=lambda pair: pair[0])


def next_item_code(session: Session, project_id: int, location_code: str, prefix: str) -> str:
    """`<LOC>-<TYPE>-NN` (or `<TYPE>-NN`, `FR-NN`): the smallest free number of the series
    (ADR-0021, no gap; `item_code_sequence` is no longer used)."""
    head = _series_head(location_code, prefix)
    used = {n for n, _ in _series(session, project_id, head)}
    number = next(n for n in range(1, len(used) + 2) if n not in used)
    return f"{head}{number:02d}"


def placement_code(session: Session, project_id: int, location_id: int | None, prefix: str) -> str:
    """A new code for a placement: the smallest free number of (location, type) (ADR-0018/0021)."""
    return next_item_code(session, project_id, location_code_of(session, location_id), prefix)


def _before_first_indice(session: Session, project_id: int) -> bool:
    return get_project(session, project_id).indice is None


def _compact(session: Session, project_id: int, head: str, clock: Clock) -> None:
    """Closes the gaps of a series after a code was freed, before the project's first indice only:
    the following codes move down one step, journaled on their article (ADR-0021). After it, no
    issued code moves; the next new code fills the gap."""
    if not head or not _before_first_indice(session, project_id):
        return
    for wanted, (number, holder) in enumerate(_series(session, project_id, head), start=1):
        if number == wanted:
            continue
        if isinstance(holder, ProjectItemPlacement):
            item = session.get(ProjectItem, holder.project_item_id)
            assert item is not None
            before = _placements_json(item)
            holder.code = f"{head}{wanted:02d}"
            session.flush()
            write_event(
                session,
                item,
                "placement",
                clock,
                old_value=before,
                new_value=_placements_json(item),
            )
        else:
            old = holder.item_code
            holder.item_code = f"{head}{wanted:02d}"
            session.flush()
            write_event(session, holder, "other", clock, old_value=old, new_value=holder.item_code)


def _head_of(code: str) -> str:
    """Series of an existing code (`CHA-LUD-03` → `CHA-LUD-`)."""
    head, _, number = code.rpartition("-")
    return f"{head}-" if head and number.isdigit() else ""


def _prefix_of(session: Session, item: ProjectItem) -> str:
    """Type code of an existing article (its type may have been archived since)."""
    category = session.get(Category, item.category_id) if item.category_id else None
    assert category is not None  # a product always has a type (CHECK fee_has_no_type)
    return category.code


def _check_code_free(session: Session, project_id: int, code: str, exclude_id: int | None) -> None:
    taken = session.scalar(
        select(ProjectItem.id).where(
            ProjectItem.project_id == project_id, ProjectItem.item_code == code
        )
    )
    if taken is not None and taken != exclude_id:
        raise _err("itemCode", fr.ITEM_CODE_TAKEN)


# --- references and defaults of a new article --------------------------------------------------


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
    values = data.model_dump(exclude={"placements", "item_code"})
    check_code(session, "family", data.family, "family")
    check_code(session, "usage", data.usage, "usage")
    if data.kind == "fee":
        if data.category_id is not None or data.placements:
            raise _err("kind", fr.ITEM_FEE_HAS_NO_TYPE)
        if data.supplier_id is None:
            raise _err("supplierId", fr.ITEM_FEE_NEEDS_SUPPLIER)
    if data.kind == "product" and values["category_id"] is None:
        raise _err("categoryId", fr.ITEM_CATEGORY_REQUIRED)
    _check_reference(session, Category, "categoryId", values["category_id"], "Type de produit")
    # The name is required ; the designation defaults to it (and a bare designation, e.g. a fee
    # typed inline, is its own name).
    values["product_name"] = values["product_name"] or values["name"]
    values["name"] = values["name"] or values["product_name"]
    if not values["name"]:
        raise _err("productName", fr.ITEM_PRODUCT_NAME_REQUIRED)
    supplier = _check_reference(
        session, Supplier, "supplierId", values["supplier_id"], "Fournisseur"
    )
    if values["currency"] is None:
        values["currency"] = supplier.currency if supplier is not None else "EUR"
    if values["unit_cost_cents"] is None:
        values["unit_cost_cents"] = 0
    if values["discount_bp"] is None:
        values["discount_bp"] = 0
    values["fx_rate_micro"] = resolve_fx(
        session, project_id, values["currency"], values["fx_rate_micro"]
    )
    return values


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


def _placements_json(item: ProjectItem) -> str:
    return json.dumps(
        [{"location": p.location_id, "qty": p.qty_milli, "code": p.code} for p in item.placements],
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
        item = _add_placement(session, item_id, data, clock)
    return _reloaded(session, item)


def _add_placement(
    session: Session, item_id: int, data: PlacementCreate, clock: Clock
) -> ProjectItem:
    """Body of `add_placement`, inside the caller's transaction (also used by `save_item`)."""
    item = _editable(session, item_id)
    if item.kind == "fee":
        raise ConflictError(fr.PLACEMENT_ON_FEE)
    if item.option_of_id is not None:
        raise ConflictError(fr.OPTION_HAS_NO_PLACEMENT)
    _check_location(session, item.project_id, data.location_id)
    if any(p.location_id == data.location_id for p in item.placements):
        raise _err("locationId", fr.PLACEMENT_LOCATION_TAKEN)
    before = _placements_json(item)
    now = stamp(clock)
    item.placements.append(
        ProjectItemPlacement(
            project_id=item.project_id,
            location_id=data.location_id,
            code=placement_code(
                session, item.project_id, data.location_id, _prefix_of(session, item)
            ),
            qty_milli=data.qty_milli,
            sort_order=data.sort_order,
            created_at=now,
            updated_at=now,
        )
    )
    item.updated_at = now
    _journal_placements(session, item, before, clock)
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
        item = _update_placement(session, placement_id, data, clock)
    return _reloaded(session, item)


def _update_placement(
    session: Session, placement_id: int, data: PlacementUpdate, clock: Clock
) -> ProjectItem:
    """Body of `update_placement`, inside the caller's transaction (also used by `save_item`)."""
    item, placement = _placement(session, placement_id)
    changes = data.model_dump(exclude_unset=True)
    if "location_id" in changes and changes["location_id"] != placement.location_id:
        _check_location(session, item.project_id, changes["location_id"])
        if any(
            p.id != placement.id and p.location_id == changes["location_id"]
            for p in item.placements
        ):
            raise _err("locationId", fr.PLACEMENT_LOCATION_TAKEN)
        # The code follows the room: a new number in the arrival location (ADR-0018).
        changes["code"] = placement_code(
            session, item.project_id, changes["location_id"], _prefix_of(session, item)
        )
    freed = _head_of(placement.code) if "code" in changes else ""
    before = _placements_json(item)
    for field_name, value in changes.items():
        setattr(placement, field_name, value)
    placement.updated_at = item.updated_at = stamp(clock)
    _journal_placements(session, item, before, clock)
    _compact(session, item.project_id, freed, clock)
    return item


def delete_placement(session: Session, placement_id: int, clock: Clock) -> ProjectItem:
    with session.begin():
        item = _delete_placement(session, placement_id, clock)
    return _reloaded(session, item)


def _delete_placement(session: Session, placement_id: int, clock: Clock) -> ProjectItem:
    """Body of `delete_placement`, inside the caller's transaction (also used by `save_item`)."""
    item, placement = _placement(session, placement_id)
    if len(item.placements) <= 1:
        raise ConflictError(fr.PLACEMENT_LAST_ONE)
    before = _placements_json(item)
    freed = _head_of(placement.code)
    item.placements.remove(placement)
    item.updated_at = stamp(clock)
    _journal_placements(session, item, before, clock)
    _compact(session, item.project_id, freed, clock)
    return item


# --- create / update / delete -----------------------------------------------------------------


def create_item(
    session: Session, project_id: int, data: ProjectItemCreate, clock: Clock
) -> ProjectItem:
    with session.begin():
        ensure_open(get_project(session, project_id))
        now = stamp(clock)
        values = _resolve_defaults(session, project_id, data, now)
        placements: list[PlacementCreate] = []
        base: ProjectItem | None = None
        if data.option_of_id is not None:
            base = _option_base(session, project_id, data.option_of_id)
            if data.kind == "fee" or data.placements:
                raise _err("optionOfId", fr.OPTION_HAS_NO_PLACEMENT)
            if data.category_id != base.category_id:
                raise _err("categoryId", fr.OPTION_TYPE_MISMATCH)
        elif data.kind == "product":
            placements = data.placements or [PlacementCreate()]
        seen: set[int | None] = set()
        for placement in placements:
            _check_location(session, project_id, placement.location_id)
            if placement.location_id in seen:
                raise _err("placements", fr.PLACEMENT_LOCATION_TAKEN)
            seen.add(placement.location_id)
        code: str | None = None
        prefix = ""
        if data.kind == "fee":
            if data.item_code:
                _check_code_free(session, project_id, data.item_code, None)
            code = data.item_code or next_item_code(session, project_id, "", FEE_PREFIX)
        else:
            if data.item_code:
                raise _err("itemCode", fr.ITEM_CODE_FEE_ONLY)
            prefix = type_code(session, values["category_id"])
        values.pop("option_of_id", None)
        item = ProjectItem(
            **values, project_id=project_id, item_code=code, created_at=now, updated_at=now
        )
        if base is not None:
            item.option_of_id, item.option_letter = base.id, _next_letter(session, base.id)
        for placement in placements:
            item.placements.append(
                ProjectItemPlacement(
                    project_id=project_id,
                    location_id=placement.location_id,
                    code=placement_code(session, project_id, placement.location_id, prefix),
                    qty_milli=placement.qty_milli,
                    sort_order=placement.sort_order,
                    created_at=now,
                    updated_at=now,
                )
            )
        session.add(item)
        session.flush()
        write_event(
            session,
            item,
            "created",
            clock,
            to_status="to_quote",
            new_value=price_json(item),
        )
    return _reloaded(session, item)


def update_item(
    session: Session, item_id: int, data: ProjectItemUpdate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _update_item(session, item_id, data, clock)
    return _reloaded(session, item)


def _update_item(
    session: Session, item_id: int, data: ProjectItemUpdate, clock: Clock
) -> ProjectItem:
    """Body of `update_item`, inside the caller's transaction (also used by `save_item`)."""
    item = _editable(session, item_id)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("family") != item.family:
        check_code(session, "family", changes.get("family"), "family")
    if changes.get("usage") != item.usage:
        check_code(session, "usage", changes.get("usage"), "usage")
    if "item_code" in changes and changes["item_code"] != item.item_code:
        if item.kind != "fee":
            raise _err("itemCode", fr.ITEM_CODE_FEE_ONLY)
        _check_code_free(session, item.project_id, changes["item_code"], item_id)
    if item.kind == "fee":
        if changes.get("category_id") is not None:
            raise _err("kind", fr.ITEM_FEE_HAS_NO_TYPE)
        if "supplier_id" in changes and changes["supplier_id"] is None:
            raise _err("supplierId", fr.ITEM_FEE_NEEDS_SUPPLIER)
    elif "category_id" in changes and changes["category_id"] is None:
        raise _err("categoryId", fr.ITEM_CATEGORY_REQUIRED)
    _check_reference(session, Supplier, "supplierId", changes.get("supplier_id"), "Fournisseur")
    if (
        "category_id" in changes
        and changes["category_id"] is not None
        and changes["category_id"] != item.category_id
    ):
        # A new type recodes every placement (ADR-0018), journaled with the codes.
        if item.option_of_id is not None:
            raise _err("categoryId", fr.OPTION_TYPE_LOCKED)
        _recode(session, item, type_code(session, changes["category_id"]), clock)
        for option in _options_of(session, item.id):  # options share the base's type
            option.category_id = changes["category_id"]
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
    for field_name, value in changes.items():
        setattr(item, field_name, value)
    item.updated_at = stamp(clock)
    after_price = price_json(item)
    if after_price != before_price:
        write_event(session, item, "price", clock, old_value=before_price, new_value=after_price)
    return item


def delete_item(session: Session, item_id: int, clock: Clock, files_dir: Path) -> None:
    """Physical deletion (DATA_MODEL §5, ADR-0021): any article before the project's first indice;
    after it, « à chiffrer » with no event other than `created`. Never a base with options. The
    freed codes (or option letter) are closed up before the first indice."""
    with session.begin():
        item = get_item(session, item_id)
        ensure_open(get_project(session, item.project_id))
        if _options_of(session, item.id):
            raise ConflictError(fr.ITEM_HAS_OPTIONS)
        if not _before_first_indice(session, item.project_id):
            others = session.scalar(
                select(func.count())
                .select_from(ProjectItemEvent)
                .where(
                    ProjectItemEvent.project_item_id == item_id,
                    ProjectItemEvent.kind != "created",
                    # an option's note « base modified » is not its own history
                    or_(
                        ProjectItemEvent.note.is_(None),
                        ProjectItemEvent.note != fr.OPTION_BASE_CHANGED_NOTE,
                    ),
                )
            )
            if item.status != "to_quote" or others:
                raise ConflictError(fr.ITEM_DELETE_ONLY_NEW)
        freed = [_head_of(p.code) for p in item.placements]
        if item.item_code:
            freed.append(_head_of(item.item_code))
        base_id = item.option_of_id
        project_id = item.project_id
        file_ids = [j.file_id for j in item.files]
        session.delete(item)
        session.flush()
        for head in freed:
            _compact(session, project_id, head, clock)
        if base_id is not None:
            _compact_letters(session, base_id, clock)
    for file_id in file_ids:  # a photo no other article uses leaves the disk too
        unlink_if_orphan(session, files_dir, file_id)


# --- options (ADR-0021) -----------------------------------------------------------------------


def _options_of(session: Session, base_id: int) -> list[ProjectItem]:
    return list(
        session.scalars(
            select(ProjectItem)
            .where(ProjectItem.option_of_id == base_id)
            .order_by(ProjectItem.option_letter)
        )
    )


def _option_base(session: Session, project_id: int, base_id: int) -> ProjectItem:
    base = session.get(ProjectItem, base_id)
    if (
        base is None
        or base.project_id != project_id
        or base.kind == "fee"
        or base.option_of_id is not None
    ):
        raise _err("optionOfId", fr.OPTION_BASE_INVALID)
    return base


def _next_letter(session: Session, base_id: int) -> str:
    used = {o.option_letter for o in _options_of(session, base_id)}
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        if letter not in used:
            return letter
    raise ConflictError(fr.OPTION_LETTERS_EXHAUSTED)


def _compact_letters(session: Session, base_id: int, clock: Clock) -> None:
    """Before the first indice, the letters of the options stay A, B, C… without a gap."""
    base = session.get(ProjectItem, base_id)
    if base is None or not _before_first_indice(session, base.project_id):
        return
    for letter, option in zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ", _options_of(session, base_id)):
        if option.option_letter != letter:
            old = option.option_letter
            option.option_letter = letter
            session.flush()
            write_event(session, option, "other", clock, old_value=old, new_value=letter)


def _recode(session: Session, item: ProjectItem, prefix: str, clock: Clock) -> None:
    """New codes for every placement of `item` under type `prefix`, journaled; the freed series
    are closed up (ADR-0018/0021)."""
    before = _placements_json(item)
    freed = [_head_of(p.code) for p in item.placements]
    for placement in item.placements:
        placement.code = f"{placement.code}~"  # out of the series while the new code is chosen
    session.flush()
    for placement in item.placements:
        placement.code = placement_code(session, item.project_id, placement.location_id, prefix)
        session.flush()
    write_event(
        session, item, "placement", clock, old_value=before, new_value=_placements_json(item)
    )
    for head in freed:
        _compact(session, item.project_id, head, clock)


def attach_option(session: Session, base_id: int, data: OptionAttach, clock: Clock) -> ProjectItem:
    """An existing article becomes an option of `base_id`: it gives up its placements (their codes
    are closed up before the first indice) and takes the next letter (ADR-0021)."""
    with session.begin():
        item = _attach_option(session, base_id, data, clock)
    return _reloaded(session, item)


def _attach_option(session: Session, base_id: int, data: OptionAttach, clock: Clock) -> ProjectItem:
    """Body of `attach_option`, inside the caller's transaction (also used by `save_item`)."""
    base = _editable(session, base_id)
    _option_base(session, base.project_id, base.id)
    item = session.get(ProjectItem, data.project_item_id)
    if (
        item is None
        or item.id == base.id
        or item.project_id != base.project_id
        or item.kind == "fee"
        or item.option_of_id is not None
        or _options_of(session, item.id)
    ):
        raise _err("projectItemId", fr.OPTION_CANDIDATE_INVALID)
    if item.category_id != base.category_id:
        raise _err("projectItemId", fr.OPTION_TYPE_MISMATCH)
    before = _placements_json(item)
    freed = [_head_of(p.code) for p in item.placements]
    letter = _next_letter(session, base.id)
    item.placements.clear()
    item.option_of_id, item.option_letter = base.id, letter
    item.updated_at = stamp(clock)
    session.flush()
    write_event(
        session,
        item,
        "placement",
        clock,
        old_value=before,
        new_value="[]",
        note=fr.OPTION_ATTACHED_NOTE.format(letter=item.option_letter),
    )
    for head in freed:
        _compact(session, item.project_id, head, clock)
    return item


def detach_option(session: Session, option_id: int, clock: Clock) -> ProjectItem:
    """The option becomes an independent article with one unassigned placement of 1 (to place);
    the letters of the remaining options are closed up before the first indice (ADR-0021)."""
    with session.begin():
        option = _detach_option(session, option_id, clock)
    return _reloaded(session, option)


def _detach_option(session: Session, option_id: int, clock: Clock) -> ProjectItem:
    """Body of `detach_option`, inside the caller's transaction (also used by `save_item`)."""
    option = _editable(session, option_id)
    if option.option_of_id is None:
        raise ConflictError(fr.OPTION_NOT_AN_OPTION)
    base_id, letter = option.option_of_id, option.option_letter
    option.option_of_id = option.option_letter = None
    now = stamp(clock)
    option.placements.append(
        ProjectItemPlacement(
            project_id=option.project_id,
            location_id=None,
            code=placement_code(session, option.project_id, None, _prefix_of(session, option)),
            qty_milli=money.MILLI_SCALE,
            sort_order=0,
            created_at=now,
            updated_at=now,
        )
    )
    option.updated_at = now
    session.flush()
    write_event(
        session,
        option,
        "placement",
        clock,
        old_value="[]",
        new_value=_placements_json(option),
        note=fr.OPTION_DETACHED_NOTE.format(letter=letter),
    )
    _compact_letters(session, base_id, clock)
    return option


def retain_option(session: Session, option_id: int, clock: Clock) -> ProjectItem:
    """The option takes the base's place (ADR-0021): it receives the placements (recoded to its type
    if it differs), the base becomes an option under the freed letter, the other options follow."""
    with session.begin():
        option = _retain_option(session, option_id, clock)
    return _reloaded(session, option)


def _retain_option(session: Session, option_id: int, clock: Clock) -> ProjectItem:
    """Body of `retain_option`, inside the caller's transaction (also used by `save_item`)."""
    option = _editable(session, option_id)
    if option.option_of_id is None:
        raise ConflictError(fr.OPTION_NOT_AN_OPTION)
    base = get_item(session, option.option_of_id)
    letter = option.option_letter
    before_base = _placements_json(base)
    others = [o for o in _options_of(session, base.id) if o.id != option.id]
    option.option_of_id = None
    option.option_letter = None
    session.flush()
    session.execute(
        update(ProjectItemPlacement)
        .where(ProjectItemPlacement.project_item_id == base.id)
        .values(project_item_id=option.id)
    )
    for other in others:
        other.option_of_id = option.id
    base.option_of_id = option.id
    base.option_letter = letter
    base.updated_at = option.updated_at = stamp(clock)
    session.flush()
    session.expire_all()
    note = fr.OPTION_RETAINED_NOTE.format(letter=letter)
    write_event(session, base, "placement", clock, old_value=before_base, new_value="[]", note=note)
    write_event(
        session,
        option,
        "placement",
        clock,
        old_value="[]",
        new_value=_placements_json(option),
        note=note,
    )
    if option.category_id != base.category_id:
        _recode(session, option, _prefix_of(session, option), clock)
    return option


# --- status (DATA_MODEL §5) -------------------------------------------------------------------


def change_status(session: Session, item_id: int, data: StatusChange, clock: Clock) -> ProjectItem:
    """Free among the seven statuses (ADR-0013), journaled; the note is optional."""
    with session.begin():
        item = _change_status(session, item_id, data, clock)
    return _reloaded(session, item)


def _change_status(session: Session, item_id: int, data: StatusChange, clock: Clock) -> ProjectItem:
    """Body of `change_status`, inside the caller's transaction (also used by `save_item`)."""
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
    return item


# --- files --------------------------------------------------------


def _junction(item: ProjectItem, file_id: int) -> ProjectItemFile:
    for junction in item.files:
        if junction.file_id == file_id:
            return junction
    raise ConflictError(fr.FILE_NOT_ATTACHED)


def attach_file(session: Session, item_id: int, data: ItemFileAttach, clock: Clock) -> ProjectItem:
    with session.begin():
        item = _attach_file(session, item_id, data, clock)
    return _reloaded(session, item)


def _attach_file(session: Session, item_id: int, data: ItemFileAttach, clock: Clock) -> ProjectItem:
    """Body of `attach_file`, inside the caller's transaction (also used by `save_item`)."""
    item = _editable(session, item_id)
    get_file(session, data.file_id)
    if any(j.file_id == data.file_id for j in item.files):
        raise ConflictError(fr.FILE_ALREADY_ATTACHED)
    if data.is_primary and data.kind != "image":
        raise _err("isPrimary", fr.FILE_PRIMARY_NOT_IMAGE)
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
    return item


def update_file(
    session: Session, item_id: int, file_id: int, data: ItemFileUpdate, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _update_file(session, item_id, file_id, data, clock)
    return _reloaded(session, item)


def _update_file(
    session: Session, item_id: int, file_id: int, data: ItemFileUpdate, clock: Clock
) -> ProjectItem:
    """Body of `update_file`, inside the caller's transaction (also used by `save_item`)."""
    item = _editable(session, item_id)
    junction = _junction(item, file_id)
    changes = data.model_dump(exclude_unset=True)
    kind = changes.get("kind", junction.kind)
    if kind != "image" and "is_primary" not in changes:
        changes["is_primary"] = False  # a main photo sorted as finish or plan stops being main
    is_primary = changes.get("is_primary", bool(junction.is_primary))
    if is_primary and kind != "image":
        raise _err("isPrimary", fr.FILE_PRIMARY_NOT_IMAGE)
    if is_primary:
        for other in item.files:
            if other.file_id != file_id:
                other.is_primary = 0
        session.flush()
    for field_name, value in changes.items():
        setattr(junction, field_name, int(value) if field_name == "is_primary" else value)
    junction.updated_at = item.updated_at = stamp(clock)
    return item


def detach_file(
    session: Session, item_id: int, file_id: int, files_dir: Path, clock: Clock
) -> ProjectItem:
    with session.begin():
        item = _detach_file(session, item_id, file_id, clock)
    unlink_if_orphan(session, files_dir, file_id)
    return _reloaded(session, item)


def _detach_file(session: Session, item_id: int, file_id: int, clock: Clock) -> ProjectItem:
    """Body of `detach_file`, inside the caller's transaction (also used by `save_item`)."""
    item = _editable(session, item_id)
    item.files.remove(_junction(item, file_id))
    item.updated_at = stamp(clock)
    return item


# --- « Enregistrer » : every change of the article page at once (2026-10-15) -------------------


def save_item(
    session: Session, item_id: int, data: ItemSave, files_dir: Path, clock: Clock
) -> ProjectItem:
    """Applies the article page's pending changes in one transaction, in order: sheet, status,
    placements, files, options attached, option retained or detached. Any refusal cancels all.
    Each step writes its usual journal rows."""
    removed_files: list[int] = []
    with session.begin():
        item = _editable(session, item_id)
        if data.sheet is not None and data.sheet.model_fields_set:
            _update_item(session, item.id, data.sheet, clock)
        if data.status is not None and data.status.status != item.status:
            _change_status(session, item.id, data.status, clock)
        if data.placements is not None:
            _save_placements(session, item, data.placements, clock)
        if data.files is not None:
            removed_files = _save_files(session, item, data.files, clock)
        for other_id in data.attach_options:
            _attach_option(session, item.id, OptionAttach(project_item_id=other_id), clock)
        if data.option_action == "retain":
            _retain_option(session, item.id, clock)
        elif data.option_action == "detach":
            _detach_option(session, item.id, clock)
    for file_id in removed_files:
        unlink_if_orphan(session, files_dir, file_id)
    return _reloaded(session, get_item(session, item_id))


def _save_placements(
    session: Session, item: ProjectItem, wanted: list[PlacementSave], clock: Clock
) -> None:
    """Brings the placements to the wanted list. The code follows the room (ADR-0018): a wanted
    location already placed keeps that placement and its code (only the quantity and order move),
    whatever row of the page it came from, so swapping two locations or removing then re-adding
    one never collides. Then: removals, quantity changes, moves of a kept row to a new location,
    additions; the final list is checked first (at least one, one per location)."""
    if item.kind == "fee" or item.option_of_id is not None:
        if wanted:
            raise ConflictError(
                fr.PLACEMENT_ON_FEE if item.kind == "fee" else fr.OPTION_HAS_NO_PLACEMENT
            )
        return
    if not wanted:
        raise ConflictError(fr.PLACEMENT_LAST_ONE)
    if len({row.location_id for row in wanted}) != len(wanted):
        raise _err("placements", fr.PLACEMENT_LOCATION_TAKEN)
    placed = {p.location_id for p in item.placements}
    for row in wanted:
        if row.location_id not in placed:  # a new room must belong to the project and be active
            _check_location(session, item.project_id, row.location_id)
    current = {p.id: p for p in item.placements}
    by_location = {p.location_id: p for p in item.placements}
    for row in wanted:
        if row.id is not None and row.id not in current:
            raise NotFoundError("placement", row.id)
    kept: dict[int, PlacementSave] = {}  # placement id → wanted row
    pending: list[PlacementSave] = []  # rows for a location not placed yet
    for row in wanted:
        same_room = by_location.get(row.location_id)
        if same_room is not None:
            kept[same_room.id] = row
        else:
            pending.append(row)
    moves: list[tuple[int, PlacementSave]] = []
    additions: list[PlacementSave] = []
    for row in pending:
        if row.id is not None and row.id not in kept and row.id not in {m[0] for m in moves}:
            moves.append((row.id, row))
        else:
            additions.append(row)
    moved = {placement_id for placement_id, _ in moves}
    for placement_id in [pid for pid in current if pid not in kept and pid not in moved]:
        placement = current[placement_id]
        before = _placements_json(item)
        freed = _head_of(placement.code)
        item.placements.remove(placement)
        item.updated_at = stamp(clock)
        _journal_placements(session, item, before, clock)
        _compact(session, item.project_id, freed, clock)
    for placement_id, row in kept.items():
        placement = current[placement_id]
        changes: dict[str, Any] = {}
        if row.qty_milli != placement.qty_milli:
            changes["qty_milli"] = row.qty_milli
        if row.sort_order != placement.sort_order:
            changes["sort_order"] = row.sort_order
        if changes:
            _update_placement(session, placement_id, PlacementUpdate(**changes), clock)
    for placement_id, row in moves:
        _update_placement(
            session,
            placement_id,
            PlacementUpdate(
                location_id=row.location_id, qty_milli=row.qty_milli, sort_order=row.sort_order
            ),
            clock,
        )
    for row in additions:
        _add_placement(
            session,
            item.id,
            PlacementCreate(
                location_id=row.location_id, qty_milli=row.qty_milli, sort_order=row.sort_order
            ),
            clock,
        )


def _save_files(
    session: Session, item: ProjectItem, wanted: list[FileSave], clock: Clock
) -> list[int]:
    """Removals, then changes, then additions; returns the removed file ids (to unlink if
    orphaned after the commit)."""
    current = {j.file_id: j for j in item.files}
    wanted_ids = {row.file_id for row in wanted}
    removed = [file_id for file_id in current if file_id not in wanted_ids]
    for file_id in removed:
        _detach_file(session, item.id, file_id, clock)
    for row in wanted:
        junction = current.get(row.file_id)
        if junction is None:
            continue
        changes: dict[str, Any] = {
            name: value
            for name, value in (
                ("kind", row.kind),
                ("is_primary", row.is_primary),
                ("caption", row.caption),
                ("sort_order", row.sort_order),
            )
            if (bool(junction.is_primary) if name == "is_primary" else getattr(junction, name))
            != value
        }
        if changes:
            _update_file(session, item.id, row.file_id, ItemFileUpdate(**changes), clock)
    for row in wanted:
        if row.file_id not in current:
            _attach_file(
                session,
                item.id,
                ItemFileAttach(
                    file_id=row.file_id,
                    kind=row.kind,
                    is_primary=row.is_primary,
                    caption=row.caption,
                    sort_order=row.sort_order,
                ),
                clock,
            )
    return removed


def recode_location(
    session: Session, location_id: int, old_code: str, new_code: str, clock: Clock
) -> None:
    """A location's code changed: its placements move to the new series, keeping their numbers
    when free (ADR-0018: the code names the room). Inside the caller's transaction, journaled."""
    old_code, new_code = old_code.upper(), new_code.upper()
    # The placements of this location only (another location's code may share a prefix, a type
    # code may equal a location code): selected by location, never by code.
    placements = [
        p
        for p in session.scalars(
            select(ProjectItemPlacement).where(ProjectItemPlacement.location_id == location_id)
        )
        if p.code.startswith(f"{old_code}-")
    ]
    project_id = placements[0].project_id if placements else 0
    befores: dict[int, tuple[ProjectItem, str]] = {}
    for placement in placements:
        item = session.get(ProjectItem, placement.project_item_id)
        assert item is not None
        befores.setdefault(item.id, (item, _placements_json(item)))
        placement.code = f"{placement.code}~"  # out of every series while the new codes are set
    session.flush()
    for placement in placements:
        wanted = new_code + placement.code[len(old_code) : -1]
        head = _head_of(wanted)
        number = _number(wanted, head) if head else None
        taken = any(n == number for n, _ in _series(session, project_id, head)) if head else True
        if number is None or taken:
            item = befores[placement.project_item_id][0]
            wanted = placement_code(
                session, project_id, placement.location_id, _prefix_of(session, item)
            )
        placement.code = wanted
        session.flush()
    for item, before in befores.values():
        item.updated_at = stamp(clock)
        write_event(
            session, item, "placement", clock, old_value=before, new_value=_placements_json(item)
        )
