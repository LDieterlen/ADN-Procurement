"""`delivery` / `delivery_line` schemas (DATA_MODEL §4.24–4.25, ADR-0008)."""

from typing import Annotated

from pydantic import Field

from ffe.schemas.base import BaseSchema, IsoDate
from ffe.schemas.project_item import Long, Short

PositiveMilli = Annotated[int, Field(ge=1)]


class DeliveryLineIn(BaseSchema):
    purchase_order_line_id: int
    qty_milli: PositiveMilli
    remarks: Short = None


class DeliveryCreate(BaseSchema):
    received_on: Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
    reference: Short = None
    notes: Long = None
    lines: list[DeliveryLineIn]


class DeliveryLineRead(BaseSchema):
    id: int
    purchase_order_line_id: int
    item_code: str
    qty_milli: int
    remarks: str | None


class DeliveryRead(BaseSchema):
    id: int
    purchase_order_id: int
    received_on: str
    reference: str | None
    notes: str | None
    lines: list[DeliveryLineRead]
    created_at: str
    updated_at: str


# Re-exported for routers that validate a date only.
ReceivedOn = IsoDate
