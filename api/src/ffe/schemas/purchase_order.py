"""`purchase_order` schemas (DATA_MODEL §4.20–4.22, ADR-0007)."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, IsoDate
from ffe.schemas.project_item import Bp, Cents, Long, Micro, Milli, Short

PoStatus = Literal["draft", "issued", "acknowledged", "partially_delivered", "closed", "cancelled"]
Description = Annotated[str, Field(min_length=1, max_length=500)]


class PoCreate(BaseSchema):
    supplier_id: int
    item_ids: list[int] = []
    expected_delivery_on: IsoDate = None
    fx_rate_micro: Micro | None = None  # None = rate of the lines (or last of the project)
    notes: Long = None


class PoUpdate(BaseSchema):
    expected_delivery_on: IsoDate = None
    supplier_ref: Short = None
    delivery_address: Long = None
    delivery_contact: Short = None
    payment_terms: Short = None
    notes: Long = None
    internal_notes: Long = None


class PoLinesAdd(BaseSchema):
    item_ids: list[int]


class PoLineUpdate(BaseSchema):
    description: Description | None = None
    qty_milli: Milli | None = None
    unit_cost_cents: Cents | None = None
    discount_bp: Bp | None = None
    vat_rate_bp: Bp | None = None
    sort_order: int | None = None

    @field_validator(
        "description", "qty_milli", "unit_cost_cents", "discount_bp", "vat_rate_bp", mode="before"
    )
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value.strip() if isinstance(value, str) else value


class PoStatusChange(BaseSchema):
    status: Literal["acknowledged", "closed", "cancelled"]
    note: Long = None


class PoFileAttach(BaseSchema):
    file_id: int
    caption: Short = None


class PoLineRead(BaseSchema):
    id: int
    purchase_order_id: int
    project_item_id: int
    item_code: str
    item_status: str
    description: str
    qty_milli: int
    unit_cost_cents: int
    discount_bp: int
    vat_rate_bp: int
    sort_order: int
    net_unit_cents: int  # money.py, never stored
    total_cents: int
    net_unit_eur_cents: int
    total_eur_cents: int
    received_qty_milli: int  # étape 10c : Σ des réceptions


class PoFileRead(BaseSchema):
    file_id: int
    caption: str | None
    sha256: str
    ext: str
    mime_type: str
    original_name: str
    size_bytes: int


class PoRead(BaseSchema):
    id: int
    project_id: int
    supplier_id: int
    supplier_name: str
    number: str
    status: PoStatus
    currency: str
    fx_rate_micro: int
    issued_on: str | None
    expected_delivery_on: str | None
    supplier_ref: str | None
    delivery_address: str | None
    delivery_contact: str | None
    payment_terms: str | None
    notes: str | None
    internal_notes: str | None
    total_cents: int
    total_eur_cents: int
    vat_by_rate_bp: dict[int, int]
    vat_cents: int
    ttc_eur_cents: int
    invoiced_ht_cents: int  # étape 10c, devise du BC, telles que facturées
    paid_ht_cents: int
    deliveries_count: int
    lines: list[PoLineRead]
    files: list[PoFileRead]
    created_at: str
    updated_at: str
