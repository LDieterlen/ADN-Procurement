"""Budget service: envelopes replaced in bulk, Budget / Prescrit / Validé / Reste by zone and by
category through `money.py` (DATA_MODEL §5, §4.16), alerts (D8.4), multi-project dashboard."""

from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe import money
from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.models import BudgetLine, Category, Client, Project, ProjectItem, Zone
from ffe.models.project import PROJECT_CLOSED_STATUSES
from ffe.schemas.budget import BudgetLinesPut
from ffe.services.base import stamp
from ffe.services.project import ensure_open, get_project
from ffe.services.project_item import summary as lines_summary
from ffe.services.purchase_order import engaged as engaged_by_item
from ffe.services.supplier_invoice import invoiced_and_paid

WARNING_BP = 9_000  # D8.4: orange at 90 %
OVER_BP = 10_000  # red at 100 %


def list_budget_lines(session: Session, project_id: int) -> list[BudgetLine]:
    get_project(session, project_id)
    return list(
        session.scalars(
            select(BudgetLine).where(BudgetLine.project_id == project_id).order_by(BudgetLine.id)
        )
    )


def put_budget_lines(
    session: Session, project_id: int, data: BudgetLinesPut, clock: Clock
) -> list[BudgetLine]:
    """Replaces every envelope of the project in one transaction (API.md « PUT /x »)."""
    with session.begin():
        ensure_open(get_project(session, project_id))
        zones = {z.id for z in session.scalars(select(Zone).where(Zone.project_id == project_id))}
        categories = {c.id: c for c in session.scalars(select(Category))}
        scopes: set[tuple[int | None, int | None]] = set()
        for index, line in enumerate(data.lines):
            scope = (line.zone_id, line.category_id)
            if scope in scopes:
                raise ConflictError(fr.BUDGET_DUPLICATE_SCOPE)
            scopes.add(scope)
            if line.zone_id is not None and line.zone_id not in zones:
                raise ValidationAppError(
                    [ErrorDetail(f"lines.{index}.zoneId", fr.BUDGET_ZONE_NOT_IN_PROJECT)]
                )
            if line.category_id is not None and line.category_id not in categories:
                raise ValidationAppError(
                    [ErrorDetail(f"lines.{index}.categoryId", fr.BUDGET_CATEGORY_NOT_FOUND)]
                )
        # Anti double counting (DATA_MODEL §4.16): never a parent and one of its children for the same zone.
        for index, line in enumerate(data.lines):
            category = categories.get(line.category_id) if line.category_id is not None else None
            if (
                category is not None
                and category.parent_id is not None
                and (line.zone_id, category.parent_id) in scopes
            ):
                raise ValidationAppError(
                    [ErrorDetail(f"lines.{index}.categoryId", fr.BUDGET_DOUBLE_COUNT)]
                )
        for existing in session.scalars(
            select(BudgetLine).where(BudgetLine.project_id == project_id)
        ):
            session.delete(existing)
        session.flush()
        now = stamp(clock)
        for line in data.lines:
            session.add(
                BudgetLine(
                    project_id=project_id, **line.model_dump(), created_at=now, updated_at=now
                )
            )
    return list_budget_lines(session, project_id)


def _alert(budget: int | None, specified: int) -> str:
    if budget is None or budget <= 0:
        return "none"
    ratio_bp = money.div_round(specified * money.BP_SCALE, budget)
    if ratio_bp >= OVER_BP:
        return "over"
    if ratio_bp >= WARNING_BP:
        return "warning"
    return "none"


def _row(
    zone_id: int | None,
    category_id: int | None,
    label: str,
    multiplier: int,
    budget: int | None,
    specified: int,
    approved: int,
    engaged: int = 0,
) -> dict[str, Any]:
    return {
        "zone_id": zone_id,
        "category_id": category_id,
        "label": label,
        "multiplier": multiplier,
        "budget_cents": budget,
        "specified_cents": specified,
        "approved_cents": approved,
        "engaged_cents": engaged,
        "remaining_cents": budget - specified if budget is not None else None,
        "alert": _alert(budget, specified),
    }


def summary_with_budget(session: Session, project_id: int, today: date) -> dict[str, Any]:
    """The 7a summary plus the budget block: by zone (placements' shares) and by level-1 category."""
    base = lines_summary(session, project_id, today)
    project = get_project(session, project_id)
    budgets = {
        (b.zone_id, b.category_id): b.amount_cents for b in list_budget_lines(session, project_id)
    }
    items = {
        i.id: i
        for i in session.scalars(select(ProjectItem).where(ProjectItem.project_id == project_id))
    }
    zones = {z.id: z for z in session.scalars(select(Zone).where(Zone.project_id == project_id))}
    categories = {c.id: c for c in session.scalars(select(Category))}

    def level1(cid: int) -> int:
        return categories[cid].parent_id or cid

    amounts = {line["project_item_id"]: line for line in base["lines"]}
    engaged = engaged_by_item(session, project_id)  # ADR-0007: issued orders, per item

    # Approved by zone: approximation at the current price of the placements (D2.14);
    # engaged by zone: same approximation at the order's unit price.
    approved_by_zone: dict[int | None, int] = {}
    engaged_by_zone: dict[int | None, int] = {}
    specified_by_category: dict[int, int] = {}
    approved_by_category: dict[int, int] = {}
    engaged_by_category: dict[int, int] = {}
    engaged_total = 0
    for item_id, line in amounts.items():
        item = items[item_id]
        in_envelope = money.is_in_ffe_envelope(item.status, item.kind)
        if not in_envelope:
            continue
        cat = level1(item.category_id)
        specified_by_category[cat] = specified_by_category.get(cat, 0) + line["total_ht_cents"]
        if item_id in engaged:
            unit_eur, total_eur = engaged[item_id]
            engaged_total += total_eur
            engaged_by_category[cat] = engaged_by_category.get(cat, 0) + total_eur
            for placement in item.placements:
                multiplier = (
                    zones[placement.zone_id].multiplier if placement.zone_id in zones else 1
                )
                engaged_by_zone[placement.zone_id] = engaged_by_zone.get(
                    placement.zone_id, 0
                ) + money.placement_ht_cents(unit_eur, placement.qty_milli, multiplier)
        if money.is_approved_or_later(item.status):
            approved_by_category[cat] = approved_by_category.get(cat, 0) + (
                line["approved_cents"] or 0
            )
            for placement in item.placements:
                multiplier = (
                    zones[placement.zone_id].multiplier if placement.zone_id in zones else 1
                )
                share = money.placement_ht_cents(
                    line["net_unit_eur_cents"], placement.qty_milli, multiplier
                )
                approved_by_zone[placement.zone_id] = (
                    approved_by_zone.get(placement.zone_id, 0) + share
                )

    by_zone = [
        _row(
            z["zone_id"],
            None,
            z["zone_name"],
            z["multiplier"],
            budgets.get((z["zone_id"], None)),
            z["specified_cents"],
            approved_by_zone.get(z["zone_id"], 0),
            engaged_by_zone.get(z["zone_id"], 0),
        )
        for z in base["zones"]
    ]
    by_category = [
        _row(
            None,
            cid,
            f"{categories[cid].code} — {categories[cid].name}",
            1,
            budgets.get((None, cid)),
            specified_by_category.get(cid, 0),
            approved_by_category.get(cid, 0),
            engaged_by_category.get(cid, 0),
        )
        for cid in sorted(
            set(specified_by_category) | {c for z, c in budgets if z is None and c is not None},
            key=lambda cid: (categories[cid].sort_order, cid),
        )
    ]
    invoiced, paid = invoiced_and_paid(session, project_id)  # ADR-0008, EUR at the order's rate
    global_budget = budgets.get((None, None))
    contingency = (
        money.div_round(global_budget * project.contingency_bp, money.BP_SCALE)
        if global_budget is not None
        else 0
    )
    base["budget"] = {
        "global_cents": global_budget,
        "contingency_bp": project.contingency_bp,
        "contingency_cents": contingency,
        "specified_cents": base["specified_cents"],
        "approved_cents": base["approved_cents"],
        "engaged_cents": engaged_total,
        "invoiced_cents": invoiced,
        "paid_cents": paid,
        "remaining_cents": global_budget - base["specified_cents"]
        if global_budget is not None
        else None,
        "alert": _alert(global_budget, base["specified_cents"]),
        "by_zone": by_zone,
        "by_category": by_category,
    }
    return base


def alerts(session: Session, project_id: int, today: date) -> list[dict[str, Any]]:
    summary = summary_with_budget(session, project_id, today)
    found: list[dict[str, Any]] = []
    budget = summary["budget"]
    if budget["alert"] != "none":
        found.append(
            {
                "kind": "budget_100" if budget["alert"] == "over" else "budget_90",
                "message": fr.ALERT_BUDGET.format(
                    scope="Projet", pct=100 if budget["alert"] == "over" else 90
                ),
            }
        )
    for row in budget["by_zone"] + budget["by_category"]:
        if row["alert"] != "none":
            found.append(
                {
                    "kind": "budget_100" if row["alert"] == "over" else "budget_90",
                    "message": fr.ALERT_BUDGET.format(
                        scope=row["label"], pct=100 if row["alert"] == "over" else 90
                    ),
                    "zone_id": row["zone_id"],
                    "category_id": row["category_id"],
                }
            )
    for line in summary["lines"]:
        if line["order_overdue"]:
            found.append(
                {
                    "kind": "order_overdue",
                    "message": fr.ALERT_ORDER.format(code=line["item_code"], on=line["order_by"]),
                    "project_item_id": line["project_item_id"],
                }
            )
    return found


def dashboard(session: Session, today: date) -> list[dict[str, Any]]:
    """Open projects with their budget figures and counters (DATA_MODEL §8 R10, without SQL sums)."""
    rows: list[dict[str, Any]] = []
    projects = session.scalars(
        select(Project)
        .where(Project.status.not_in(PROJECT_CLOSED_STATUSES))
        .order_by(Project.due_on.is_(None), Project.due_on, Project.code)
    )
    for project in projects:
        client = session.get(Client, project.client_id)
        summary = summary_with_budget(session, project.id, today)
        items = list(
            session.scalars(select(ProjectItem).where(ProjectItem.project_id == project.id))
        )
        rows.append(
            {
                "project_id": project.id,
                "code": project.code,
                "name": project.name,
                "status": project.status,
                "client_name": client.name if client else "",
                "due_on": project.due_on,
                "budget_cents": summary["budget"]["global_cents"],
                "specified_cents": summary["specified_cents"],
                "approved_cents": summary["approved_cents"],
                "remaining_cents": summary["budget"]["remaining_cents"],
                "alert": summary["budget"]["alert"],
                "draft_lines": sum(1 for i in items if i.status == "draft"),
                "on_hold_lines": sum(1 for i in items if i.on_hold),
                "overdue_lines": sum(1 for line in summary["lines"] if line["order_overdue"]),
            }
        )
    return rows
