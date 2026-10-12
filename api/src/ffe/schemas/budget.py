"""Budget schemas: forecast envelopes (PUT in bulk) and the project summary (API.md « Synthèse »)."""

from typing import Annotated, Literal

from pydantic import Field

from ffe.schemas.base import BaseSchema

Cents = Annotated[int, Field(ge=0)]
Long = Annotated[str | None, Field(max_length=2000)]

BudgetScope = Literal["global", "location", "zone", "family", "supplier"]
BudgetAlertLevel = Literal["none", "warning", "over"]
SummaryAxis = Literal["location", "zone", "family", "type", "supplier"]


class BudgetLineIn(BaseSchema):
    scope: BudgetScope
    location_id: int | None = None
    zone: Annotated[str | None, Field(max_length=200)] = None
    family: Annotated[str | None, Field(max_length=40)] = None
    supplier_id: int | None = None
    amount_cents: Cents
    notes: Long = None


class BudgetLinesPut(BaseSchema):
    lines: list[BudgetLineIn]


class BudgetLineRead(BaseSchema):
    id: int
    project_id: int
    scope: BudgetScope
    location_id: int | None
    zone: str | None
    family: str | None
    supplier_id: int | None
    amount_cents: int
    notes: str | None
    created_at: str
    updated_at: str


class LineAmountsRead(BaseSchema):
    """Amounts of one article, computed by `money.py`, never stored."""

    project_item_id: int
    item_code: str
    status: str
    kind: str
    counted: bool
    total_qty_milli: int
    net_unit_cents: int
    net_unit_eur_cents: int
    total_ht_cents: int


class StatusShareRead(BaseSchema):
    status: str
    count: int
    amount_cents: int
    share_bp: int  # share of the counted amount, basis points


class SummaryRowRead(BaseSchema):
    """One row of a compilation (by location, zone, family, type or supplier)."""

    key: str  # id or value of the axis; '' for « non affecté »
    label: str
    budget_cents: int | None
    specified_cents: int
    quoted_cents: int
    approved_cents: int
    remaining_cents: int | None
    alert: BudgetAlertLevel


class ProjectSummaryRead(BaseSchema):
    project_id: int
    lines: list[LineAmountsRead]
    budget_cents: int | None
    specified_cents: int
    quoted_cents: int
    approved_cents: int
    remaining_cents: int | None
    alert: BudgetAlertLevel
    by_status: list[StatusShareRead]
    by_location: list[SummaryRowRead]
    by_zone: list[SummaryRowRead]
    by_family: list[SummaryRowRead]
    by_type: list[SummaryRowRead]
    by_supplier: list[SummaryRowRead]
