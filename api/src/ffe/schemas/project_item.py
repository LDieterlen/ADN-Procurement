"""`project_item` schemas: creation with default precedence, partial update, placements, status, journal."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, IsoDate
from ffe.schemas.budget import BudgetSummaryRead

ItemKind = Literal["ffe", "ose", "custom", "existing", "fee"]
ItemStatus = Literal[
    "draft",
    "specified",
    "quoted",
    "approved",
    "ordered",
    "delivered",
    "installed",
    "cancelled",
    "replaced",
]
Unit = Literal["piece", "pair", "set", "lot", "m", "m2", "roll"]
ItemFileKind = Literal["image", "quote", "approval", "drawing", "other"]
EventKind = Literal[
    "created", "status", "price", "fx", "qty", "product", "placement", "approval", "quote", "other"
]

Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=4000)]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Cents = Annotated[int, Field(ge=0)]
Bp = Annotated[int, Field(ge=0, le=10000)]
Micro = Annotated[int, Field(ge=1)]
Milli = Annotated[int, Field(ge=0)]
Mm = Annotated[int | None, Field(ge=0)]
Weeks = Annotated[int | None, Field(ge=0)]
ItemCode = Annotated[str, Field(min_length=1, max_length=20)]

STRIPPED = ("name", "item_code", "finish", "color", "materials", "quote_ref")


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class PlacementCreate(BaseSchema):
    zone_id: int | None = None  # None = « non affecté »
    qty_milli: Milli = 1000
    sort_order: int = 0
    notes: Short = None


class PlacementUpdate(BaseSchema):
    zone_id: int | None = None
    qty_milli: Milli | None = None
    sort_order: int | None = None
    notes: Short = None

    @field_validator("qty_milli", "sort_order", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value


class PlacementRead(BaseSchema):
    id: int
    project_item_id: int
    zone_id: int | None
    qty_milli: int
    sort_order: int
    notes: str | None
    created_at: str
    updated_at: str


class ProjectItemCreate(BaseSchema):
    """From a product (`productId`: every absent field is copied, DATA_MODEL §6) or free."""

    product_id: int | None = None
    category_id: int | None = None
    name: Short = None
    client_description: Long = None
    kind: ItemKind = "ffe"
    unit: Unit | None = None
    finish: Short = None
    color: Short = None
    materials: Short = None
    width_mm: Mm = None
    depth_mm: Mm = None
    height_mm: Mm = None
    diameter_mm: Mm = None
    supplier_id: int | None = None
    unit_cost_cents: Cents | None = None
    currency: Currency | None = None
    fx_rate_micro: Micro | None = None
    discount_bp: Bp | None = None
    vat_rate_bp: Bp | None = None
    lead_time_weeks: Weeks = None
    required_on_site: IsoDate = None
    quoted_on: IsoDate = None
    quote_valid_until: IsoDate = None
    expected_delivery_on: IsoDate = None
    quote_ref: Short = None
    item_code: ItemCode | None = None  # None = generated `<CAT>-NNN`
    sort_order: int = 0
    internal_notes: Long = None
    placements: list[PlacementCreate] | None = None  # None = one unassigned placement of 1

    @field_validator(*STRIPPED, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ProjectItemUpdate(BaseSchema):
    """Absent = unchanged. `status` never here (POST …/status), placements have their own routes."""

    product_id: int | None = None
    category_id: int | None = None
    name: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    client_description: Long = None
    kind: ItemKind | None = None
    unit: Unit | None = None
    finish: Short = None
    color: Short = None
    materials: Short = None
    width_mm: Mm = None
    depth_mm: Mm = None
    height_mm: Mm = None
    diameter_mm: Mm = None
    supplier_id: int | None = None
    unit_cost_cents: Cents | None = None
    currency: Currency | None = None
    fx_rate_micro: Micro | None = None
    discount_bp: Bp | None = None
    vat_rate_bp: Bp | None = None
    lead_time_weeks: Weeks = None
    required_on_site: IsoDate = None
    quoted_on: IsoDate = None
    quote_valid_until: IsoDate = None
    expected_delivery_on: IsoDate = None
    quote_ref: Short = None
    order_ref: Short = None
    on_hold: bool | None = None
    item_code: ItemCode | None = None
    sort_order: int | None = None
    internal_notes: Long = None

    @field_validator(
        "category_id",
        "name",
        "kind",
        "unit",
        "unit_cost_cents",
        "currency",
        "fx_rate_micro",
        "discount_bp",
        "vat_rate_bp",
        "on_hold",
        "item_code",
        "sort_order",
        mode="before",
    )
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator("finish", "color", "materials", "quote_ref", "order_ref", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class StatusChange(BaseSchema):
    status: ItemStatus
    note: Long = None


class ReplaceProduct(BaseSchema):
    """« Remplacer le produit » from `approved`: a new line takes the code, the old one is `replaced`."""

    product_id: int
    unit_cost_cents: Cents | None = None
    currency: Currency | None = None
    fx_rate_micro: Micro | None = None
    discount_bp: Bp | None = None
    supplier_id: int | None = None
    note: Long = None


class ItemFileAttach(BaseSchema):
    file_id: int
    kind: ItemFileKind = "other"
    is_primary: bool = False
    caption: Short = None
    sort_order: int = 0


class ItemFileUpdate(BaseSchema):
    kind: ItemFileKind | None = None
    is_primary: bool | None = None
    caption: Short = None
    sort_order: int | None = None


class ItemFileRead(BaseSchema):
    file_id: int
    kind: ItemFileKind
    is_primary: bool
    caption: str | None
    sort_order: int
    sha256: str
    ext: str
    mime_type: str
    original_name: str
    size_bytes: int

    @classmethod
    def from_junction(cls, junction: Any) -> ItemFileRead:
        return cls(
            file_id=junction.file_id,
            kind=junction.kind,
            is_primary=bool(junction.is_primary),
            caption=junction.caption,
            sort_order=junction.sort_order,
            sha256=junction.file.sha256,
            ext=junction.file.ext,
            mime_type=junction.file.mime_type,
            original_name=junction.file.original_name,
            size_bytes=junction.file.size_bytes,
        )


class ProjectItemRead(BaseSchema):
    id: int
    project_id: int
    item_code: str
    category_id: int
    product_id: int | None
    supplier_id: int | None
    name: str
    client_description: str | None
    kind: ItemKind
    unit: Unit
    finish: str | None
    color: str | None
    materials: str | None
    width_mm: int | None
    depth_mm: int | None
    height_mm: int | None
    diameter_mm: int | None
    unit_cost_cents: int
    currency: str
    fx_rate_micro: int
    discount_bp: int
    vat_rate_bp: int
    lead_time_weeks: int | None
    required_on_site: str | None
    quoted_on: str | None
    quote_valid_until: str | None
    expected_delivery_on: str | None
    quote_ref: str | None
    order_ref: str | None
    status: ItemStatus
    on_hold: bool
    replaced_by_id: int | None
    approved_at: str | None
    approved_unit_net_cents: int | None
    approved_total_qty_milli: int | None
    sort_order: int
    internal_notes: str | None
    created_at: str
    updated_at: str
    placements: list[PlacementRead]
    files: list[ItemFileRead]

    @classmethod
    def from_model(cls, item: Any) -> ProjectItemRead:
        base = {
            name: getattr(item, name)
            for name in cls.model_fields
            if name not in ("placements", "files", "on_hold")
        }
        return cls(
            **base,
            on_hold=bool(item.on_hold),
            placements=[PlacementRead.model_validate(p) for p in item.placements],
            files=[ItemFileRead.from_junction(f) for f in item.files],
        )


class EventRead(BaseSchema):
    id: int
    project_item_id: int
    kind: str
    from_status: str | None
    to_status: str | None
    old_value: str | None
    new_value: str | None
    changed_at: str
    note: str | None


# --- summary (totals computed by money.py, never stored; extended with budgets at step 8) ------


class LineAmountsRead(BaseSchema):
    project_item_id: int
    item_code: str
    status: ItemStatus
    kind: ItemKind
    counted: bool
    amount_counted: bool
    total_qty_milli: int
    net_unit_cents: int
    net_unit_eur_cents: int
    total_ht_cents: int
    approved_cents: int | None
    order_by: str | None  # latest order date (D7.5), None when unknown
    order_overdue: bool


class ZoneAmountsRead(BaseSchema):
    zone_id: int | None
    zone_code: str | None
    zone_name: str
    multiplier: int
    specified_cents: int


class ProjectSummaryRead(BaseSchema):
    project_id: int
    lines: list[LineAmountsRead]
    zones: list[ZoneAmountsRead]
    specified_cents: int
    approved_cents: int
    ose_cents: int
    vat_by_rate_bp: dict[int, int]
    vat_cents: int
    ttc_cents: int
    budget: BudgetSummaryRead | None = None  # step 8: filled by services/budget.summary_with_budget
