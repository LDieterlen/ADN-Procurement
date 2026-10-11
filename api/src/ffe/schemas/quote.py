"""`quote`, `quote_line`, `quote_file` schemas (DATA_MODEL §4.17–4.19, ADR-0006)."""

from typing import Annotated, Any

from pydantic import Field, field_validator, model_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, IsoDate
from ffe.schemas.project_item import Bp, Cents, Currency, Long, Micro, Short, Weeks

Reference = Annotated[str, Field(min_length=1, max_length=100)]


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class QuoteLineCreate(BaseSchema):
    project_item_id: int
    unit_cost_cents: Cents
    discount_bp: Bp = 0
    lead_time_weeks: Weeks = None
    description: Short = None
    notes: Long = None


class QuoteLineUpdate(BaseSchema):
    unit_cost_cents: Cents | None = None
    discount_bp: Bp | None = None
    lead_time_weeks: Weeks = None
    description: Short = None
    notes: Long = None

    @field_validator("unit_cost_cents", "discount_bp", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value


class QuoteCreate(BaseSchema):
    supplier_id: int
    reference: Reference
    quoted_on: IsoDate = None
    valid_until: IsoDate = None
    currency: Currency | None = None  # None = supplier currency
    fx_rate_micro: Micro | None = None  # None = last rate of the project for that currency
    notes: Long = None
    lines: list[QuoteLineCreate] = []

    @field_validator("reference", mode="before")
    @classmethod
    def strip_reference(cls, value: Any) -> Any:
        return _strip(value)

    @model_validator(mode="after")
    def dates_ordered(self) -> QuoteCreate:
        if self.quoted_on and self.valid_until and self.valid_until < self.quoted_on:
            raise ValueError(fr.QUOTE_VALID_BEFORE_QUOTED)
        return self


class QuoteUpdate(BaseSchema):
    reference: Reference | None = None
    quoted_on: IsoDate = None
    valid_until: IsoDate = None
    fx_rate_micro: Micro | None = None
    notes: Long = None

    @field_validator("reference", "fx_rate_micro", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)


class QuoteFileAttach(BaseSchema):
    file_id: int
    caption: Short = None


class QuoteLineRead(BaseSchema):
    id: int
    quote_id: int
    project_item_id: int
    item_code: str
    item_name: str
    unit_cost_cents: int
    discount_bp: int
    lead_time_weeks: int | None
    description: str | None
    notes: str | None
    retained_at: str | None
    net_unit_cents: int  # money.py, never stored
    net_unit_eur_cents: int
    created_at: str
    updated_at: str


class QuoteFileRead(BaseSchema):
    file_id: int
    caption: str | None
    sha256: str
    ext: str
    mime_type: str
    original_name: str
    size_bytes: int


class QuoteRead(BaseSchema):
    id: int
    project_id: int
    supplier_id: int
    supplier_name: str
    reference: str
    quoted_on: str | None
    valid_until: str | None
    currency: str
    fx_rate_micro: int
    declined_at: str | None
    notes: str | None
    retained_count: int
    lines: list[QuoteLineRead]
    files: list[QuoteFileRead]
    created_at: str
    updated_at: str


class ItemQuoteRead(BaseSchema):
    """One row of the comparison of `GET /project-items/{id}/quotes`."""

    quote_id: int
    quote_line_id: int
    supplier_id: int
    supplier_name: str
    reference: str
    quoted_on: str | None
    valid_until: str | None
    currency: str
    fx_rate_micro: int
    unit_cost_cents: int
    discount_bp: int
    lead_time_weeks: int | None
    description: str | None
    net_unit_cents: int
    net_unit_eur_cents: int
    retained: bool
    declined: bool
