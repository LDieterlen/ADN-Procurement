"""Budget schemas: envelopes (PUT in bulk), budget part of the summary, alerts (API.md « Budgets », « Synthèse »)."""

from typing import Annotated, Literal

from pydantic import Field

from ffe.schemas.base import BaseSchema

Cents = Annotated[int, Field(ge=0)]
Long = Annotated[str | None, Field(max_length=2000)]

BudgetAlertLevel = Literal["none", "warning", "over"]
AlertKind = Literal["budget_90", "budget_100", "order_overdue"]


class BudgetLineIn(BaseSchema):
    zone_id: int | None = None
    category_id: int | None = None
    amount_cents: Cents
    notes: Long = None


class BudgetLinesPut(BaseSchema):
    lines: list[BudgetLineIn]


class BudgetLineRead(BaseSchema):
    id: int
    project_id: int
    zone_id: int | None
    category_id: int | None
    amount_cents: int
    notes: str | None
    created_at: str
    updated_at: str


class BudgetRowRead(BaseSchema):
    """One row of the Budget tab: per zone (D8.3 default) or per level-1 category; D8.4 alert level."""

    zone_id: int | None
    category_id: int | None
    label: str
    multiplier: int
    budget_cents: int | None
    specified_cents: int
    approved_cents: int
    engaged_cents: int  # étape 10b (ADR-0007)
    remaining_cents: int | None
    alert: BudgetAlertLevel


class BudgetSummaryRead(BaseSchema):
    global_cents: int | None
    contingency_bp: int
    contingency_cents: int
    specified_cents: int
    approved_cents: int
    engaged_cents: int
    remaining_cents: int | None
    alert: BudgetAlertLevel
    by_zone: list[BudgetRowRead]
    by_category: list[BudgetRowRead]


class AlertRead(BaseSchema):
    kind: AlertKind
    message: str
    zone_id: int | None = None
    category_id: int | None = None
    project_item_id: int | None = None


class DashboardProjectRead(BaseSchema):
    project_id: int
    code: str
    name: str
    status: str
    client_name: str
    due_on: str | None
    budget_cents: int | None
    specified_cents: int
    approved_cents: int
    remaining_cents: int | None
    alert: BudgetAlertLevel
    draft_lines: int
    on_hold_lines: int
    overdue_lines: int
