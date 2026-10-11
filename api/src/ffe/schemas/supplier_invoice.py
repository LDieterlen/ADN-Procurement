"""`supplier_invoice` schemas (DATA_MODEL §4.26, ADR-0008): invoice and its payment in one row."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, IsoDate
from ffe.schemas.project_item import Cents, Long, Short

InvoiceKind = Literal["deposit", "balance", "other"]
Reference = Annotated[str, Field(min_length=1, max_length=100)]
Date = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]


class InvoiceCreate(BaseSchema):
    kind: InvoiceKind = "balance"
    reference: Reference
    invoiced_on: Date
    due_on: IsoDate = None
    amount_ht_cents: Cents
    vat_cents: Cents = 0
    notes: Long = None

    @field_validator("reference", mode="before")
    @classmethod
    def strip_reference(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


class InvoiceUpdate(BaseSchema):
    kind: InvoiceKind | None = None
    reference: Reference | None = None
    invoiced_on: IsoDate = None
    due_on: IsoDate = None
    amount_ht_cents: Cents | None = None
    vat_cents: Cents | None = None
    paid_on: IsoDate = None
    payment_ref: Short = None
    notes: Long = None

    @field_validator(
        "kind", "reference", "invoiced_on", "amount_ht_cents", "vat_cents", mode="before"
    )
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value.strip() if isinstance(value, str) else value


class InvoicePay(BaseSchema):
    paid_on: Date
    payment_ref: Short = None


class InvoiceRead(BaseSchema):
    id: int
    purchase_order_id: int
    kind: InvoiceKind
    reference: str
    invoiced_on: str
    due_on: str | None
    amount_ht_cents: int
    vat_cents: int
    ttc_cents: int  # money.py
    amount_ht_eur_cents: int  # at the order's rate
    paid_on: str | None
    payment_ref: str | None
    notes: str | None
    created_at: str
    updated_at: str
