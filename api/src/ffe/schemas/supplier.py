"""`supplier` schemas (DATA_MODEL §4.7). Only `name` is required."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=2000)]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Email = Annotated[str | None, Field(max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
Bp = Annotated[int, Field(ge=0, le=10000)]

STRIPPED = ("name", "contact_name", "phone", "website")


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class SupplierCreate(BaseSchema):
    name: Name
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    website: Short = None
    currency: Currency = "EUR"
    default_discount_bp: Bp = 0
    notes: Long = None

    @field_validator(*STRIPPED, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class SupplierUpdate(BaseSchema):
    name: Name | None = None
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    website: Short = None
    currency: Currency | None = None
    default_discount_bp: Bp | None = None
    notes: Long = None

    @field_validator("name", "currency", "default_discount_bp", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator("contact_name", "phone", "website", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class SupplierRead(BaseSchema):
    id: int
    name: str
    contact_name: str | None
    email: str | None
    phone: str | None
    website: str | None
    currency: str
    default_discount_bp: int
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
