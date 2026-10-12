"""Budget service: forecast envelopes replaced in bulk, and the project summary — budget, Prescrit,
Devisé, Validé, by status and by axis (location, zone, family, type, supplier) — all through
`money.py` (DATA_MODEL §5, §4.16 ; ADR-0013). Nothing summed in SQL, nothing stored."""

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.models import BudgetLine, Category, Location, ProjectItem, Supplier
from ffe.models.project_item import ITEM_FAMILIES, ITEM_STATUSES
from ffe.schemas.budget import BudgetLinesPut
from ffe.services.base import stamp
from ffe.services.project import ensure_open, get_project
from ffe.services.project_item import list_items

UNASSIGNED = ""  # key of « non affecté » rows
FEE_KEY = "fee"  # key of the « Frais » row on the family and type axes


def list_budget_lines(session: Session, project_id: int) -> list[BudgetLine]:
    get_project(session, project_id)
    return list(
        session.scalars(
            select(BudgetLine).where(BudgetLine.project_id == project_id).order_by(BudgetLine.id)
        )
    )


def _scope_key(line: Any) -> tuple[str, str]:
    """`(scope, reference)` of an envelope, the same for a payload row and a stored row."""
    if line.scope == "location":
        return "location", str(line.location_id)
    if line.scope == "zone":
        return "zone", str(line.zone)
    if line.scope == "family":
        return "family", str(line.family)
    if line.scope == "supplier":
        return "supplier", str(line.supplier_id)
    return "global", ""


def put_budget_lines(
    session: Session, project_id: int, data: BudgetLinesPut, clock: Clock
) -> list[BudgetLine]:
    """Replaces every envelope of the project in one transaction (API.md « PUT /x »)."""
    with session.begin():
        ensure_open(get_project(session, project_id))
        locations = {
            z.id for z in session.scalars(select(Location).where(Location.project_id == project_id))
        }
        seen: set[tuple[str, str]] = set()
        for index, line in enumerate(data.lines):
            refs = {
                "location": line.location_id,
                "zone": line.zone,
                "family": line.family,
                "supplier": line.supplier_id,
            }
            for scope, value in refs.items():
                if (value is not None) != (line.scope == scope):
                    raise ValidationAppError(
                        [ErrorDetail(f"lines.{index}.scope", fr.BUDGET_REFERENCE_MISMATCH)]
                    )
            if line.scope == "location" and line.location_id not in locations:
                raise ValidationAppError(
                    [ErrorDetail(f"lines.{index}.locationId", fr.BUDGET_LOCATION_NOT_IN_PROJECT)]
                )
            if line.scope == "family" and line.family not in ITEM_FAMILIES:
                raise ValidationAppError(
                    [ErrorDetail(f"lines.{index}.family", fr.BUDGET_REFERENCE_MISMATCH)]
                )
            if line.scope == "zone" and not str(line.zone).strip():
                raise ValidationAppError(
                    [ErrorDetail(f"lines.{index}.zone", fr.BUDGET_REFERENCE_MISMATCH)]
                )
            if line.scope == "supplier" and session.get(Supplier, line.supplier_id) is None:
                raise ValidationAppError(
                    [ErrorDetail(f"lines.{index}.supplierId", fr.BUDGET_SUPPLIER_NOT_FOUND)]
                )
            key = _scope_key(line)
            if key in seen:
                raise ConflictError(fr.BUDGET_DUPLICATE_SCOPE)
            seen.add(key)
        for existing in session.scalars(
            select(BudgetLine).where(BudgetLine.project_id == project_id)
        ):
            session.delete(existing)
        session.flush()
        now = stamp(clock)
        for line in data.lines:
            values = line.model_dump()
            if values["zone"] is not None:
                values["zone"] = values["zone"].strip()
            session.add(BudgetLine(project_id=project_id, **values, created_at=now, updated_at=now))
    with session.begin():
        return list_budget_lines(session, project_id)


# --- summary ----------------------------------------------------------------------------------


@dataclass
class _Bucket:
    label: str
    specified: int = 0
    quoted: int = 0
    approved: int = 0
    order: tuple[Any, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class SummaryFilter:
    """Optional restriction of the summary (API.md « Synthèse ») ; every field is a conjunction."""

    location_id: int | None = None
    zone: str | None = None
    family: str | None = None
    category_id: int | None = None
    supplier_id: int | None = None


def _add(bucket: _Bucket, status: str, share: int) -> None:
    bucket.specified += share
    if money.is_quoted_or_later(status):
        bucket.quoted += share
    if money.is_approved_or_later(status):
        bucket.approved += share


def _row(key: str, bucket: _Bucket, budget: int | None) -> dict[str, Any]:
    return {
        "key": key,
        "label": bucket.label,
        "budget_cents": budget,
        "specified_cents": bucket.specified,
        "quoted_cents": bucket.quoted,
        "approved_cents": bucket.approved,
        "remaining_cents": budget - bucket.specified if budget is not None else None,
        "alert": money.alert_level(budget, bucket.specified),
    }


def summary(
    session: Session, project_id: int, filters: SummaryFilter | None = None
) -> dict[str, Any]:
    filters = filters or SummaryFilter()
    get_project(session, project_id)
    items = list_items(session, project_id)
    locations = {
        z.id: z for z in session.scalars(select(Location).where(Location.project_id == project_id))
    }
    categories = {c.id: c for c in session.scalars(select(Category))}
    suppliers = {s.id: s for s in session.scalars(select(Supplier))}
    budgets = {_scope_key(b): b.amount_cents for b in list_budget_lines(session, project_id)}

    lines: list[dict[str, Any]] = []
    by_status: dict[str, list[int]] = {s: [0, 0] for s in ITEM_STATUSES}
    axes: dict[str, dict[str, _Bucket]] = {
        "location": {},
        "zone": {},
        "family": {},
        "type": {},
        "supplier": {},
    }
    total = _Bucket("Projet")

    def bucket(axis: str, key: str, label: str, order: tuple[Any, ...]) -> _Bucket:
        found = axes[axis].get(key)
        if found is None:
            found = axes[axis][key] = _Bucket(label, order=order)
        return found

    for item in items:
        pairs = _pairs(item, locations)
        amounts = money.line_amounts(
            item.unit_cost_cents, item.discount_bp, item.fx_rate_micro, pairs
        )
        counted = money.is_counted(item.status)
        lines.append(
            {
                "project_item_id": item.id,
                "item_code": item.item_code,
                "status": item.status,
                "kind": item.kind,
                "counted": counted,
                "total_qty_milli": amounts.total_qty_milli,
                "net_unit_cents": amounts.net_unit_cents,
                "net_unit_eur_cents": amounts.net_unit_eur_cents,
                "total_ht_cents": amounts.total_ht_cents,
            }
        )
        if not _item_matches(item, filters):
            continue
        # Shares per placement (location and zone axes), the line total for the other axes.
        shares = _shares(item, locations, amounts.net_unit_eur_cents, filters)
        kept = sum(share for _, share in shares)
        by_status[item.status][0] += 1
        if not counted:
            continue
        by_status[item.status][1] += kept
        _add(total, item.status, kept)
        for location, share in shares:
            if location is None:
                _add(bucket("location", UNASSIGNED, "Non affecté", (1, 0)), item.status, share)
                _add(bucket("zone", UNASSIGNED, "Sans zone", (1, "")), item.status, share)
            else:
                _add(
                    bucket(
                        "location",
                        str(location.id),
                        f"{location.code} — {location.name}",
                        (0, location.sort_order, location.id),
                    ),
                    item.status,
                    share,
                )
                zone = location.zone or ""
                _add(
                    bucket("zone", zone, zone or "Sans zone", (0 if zone else 1, zone)),
                    item.status,
                    share,
                )
        if item.kind == "fee":
            _add(bucket("family", FEE_KEY, "Frais", (2, "")), item.status, kept)
            _add(bucket("type", FEE_KEY, "Frais", (2, "")), item.status, kept)
        else:
            family = item.family or ""
            _add(
                bucket(
                    "family",
                    family,
                    fr.ITEM_FAMILY_LABELS.get(family, "Sans famille"),
                    (0 if family else 1, family),
                ),
                item.status,
                kept,
            )
            category = categories.get(item.category_id) if item.category_id else None
            _add(
                bucket(
                    "type",
                    str(item.category_id),
                    f"{category.code} — {category.name}" if category else "",
                    (0, category.sort_order if category else 0, item.category_id),
                ),
                item.status,
                kept,
            )
        supplier = suppliers.get(item.supplier_id) if item.supplier_id else None
        _add(
            bucket(
                "supplier",
                str(item.supplier_id) if supplier else UNASSIGNED,
                supplier.name if supplier else "Sans fournisseur",
                (0, supplier.name) if supplier else (1, ""),
            ),
            item.status,
            kept,
        )

    global_budget = budgets.get(("global", ""))
    scope_of = {"location": "location", "zone": "zone", "family": "family", "supplier": "supplier"}

    def rows(axis: str) -> list[dict[str, Any]]:
        found = axes[axis]
        if axis in scope_of:
            for (scope, ref), _amount in budgets.items():
                if scope == scope_of[axis] and ref not in found:
                    found[ref] = _Bucket(
                        _budget_label(axis, ref, locations, suppliers), order=(0, ref)
                    )
        return [
            _row(key, b, budgets.get((scope_of[axis], key)) if axis in scope_of else None)
            for key, b in sorted(found.items(), key=lambda kv: kv[1].order)
        ]

    return {
        "project_id": project_id,
        "lines": lines,
        "budget_cents": global_budget,
        "specified_cents": total.specified,
        "quoted_cents": total.quoted,
        "approved_cents": total.approved,
        "remaining_cents": global_budget - total.specified if global_budget is not None else None,
        "alert": money.alert_level(global_budget, total.specified),
        "by_status": [
            {
                "status": status,
                "count": count,
                "amount_cents": amount,
                "share_bp": money.share_bp(amount, total.specified) if status != "cancelled" else 0,
            }
            for status, (count, amount) in by_status.items()
        ],
        "by_location": rows("location"),
        "by_zone": rows("zone"),
        "by_family": rows("family"),
        "by_type": rows("type"),
        "by_supplier": rows("supplier"),
    }


def _pairs(item: ProjectItem, locations: dict[int, Location]) -> list[tuple[int, int]]:
    if item.kind == "fee":
        return [(money.MILLI_SCALE, 1)]
    return [
        (p.qty_milli, locations[p.location_id].multiplier if p.location_id in locations else 1)
        for p in item.placements
    ]


def _item_matches(item: ProjectItem, filters: SummaryFilter) -> bool:
    if filters.family is not None and (item.family or "") != filters.family:
        return False
    if filters.category_id is not None and item.category_id != filters.category_id:
        return False
    if filters.supplier_id is not None and item.supplier_id != filters.supplier_id:
        return False
    return True


def _shares(
    item: ProjectItem,
    locations: dict[int, Location],
    unit_eur_cents: int,
    filters: SummaryFilter,
) -> list[tuple[Location | None, int]]:
    """`(location, EUR share)` per placement, restricted by the location / zone filters."""
    if item.kind == "fee":
        if filters.location_id is not None or filters.zone is not None:
            return []
        return [(None, money.total_ht_cents(unit_eur_cents, money.MILLI_SCALE))]
    shares: list[tuple[Location | None, int]] = []
    for placement in item.placements:
        location = locations.get(placement.location_id) if placement.location_id else None
        if filters.location_id is not None and placement.location_id != filters.location_id:
            continue
        if filters.zone is not None and ((location.zone if location else "") or "") != filters.zone:
            continue
        multiplier = location.multiplier if location else 1
        shares.append(
            (location, money.placement_ht_cents(unit_eur_cents, placement.qty_milli, multiplier))
        )
    return shares


def _budget_label(
    axis: str, ref: str, locations: dict[int, Location], suppliers: dict[int, Supplier]
) -> str:
    if axis == "location":
        location = locations.get(int(ref)) if ref.isdigit() else None
        return f"{location.code} — {location.name}" if location else ref
    if axis == "supplier":
        supplier = suppliers.get(int(ref)) if ref.isdigit() else None
        return supplier.name if supplier else ref
    if axis == "family":
        return fr.ITEM_FAMILY_LABELS.get(ref, ref)
    return ref
