"""`supplier` schemas (DATA_MODEL §4.7). Only `name` is required."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, strip_text

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=2000)]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Email = Annotated[str | None, Field(max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]

STRIPPED = (
    "name",
    "specialty",
    "contact_name",
    "phone",
    "mobile",
    "contact2_name",
    "contact2_phone",
    "website",
)


class SupplierCreate(BaseSchema):
    name: Name
    specialty: Short = None
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    mobile: Short = None
    contact2_name: Short = None
    contact2_phone: Short = None
    contact2_email: Email = None
    website: Short = None
    currency: Currency = "EUR"
    notes: Long = None

    @field_validator(*STRIPPED, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return strip_text(value)


class SupplierUpdate(BaseSchema):
    name: Name | None = None
    specialty: Short = None
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    mobile: Short = None
    contact2_name: Short = None
    contact2_phone: Short = None
    contact2_email: Email = None
    website: Short = None
    currency: Currency | None = None
    notes: Long = None

    @field_validator("name", "currency", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return strip_text(value)

    @field_validator(*STRIPPED[1:], mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return strip_text(value)


class SupplierRead(BaseSchema):
    id: int
    name: str
    specialty: str | None
    contact_name: str | None
    email: str | None
    phone: str | None
    mobile: str | None
    contact2_name: str | None
    contact2_phone: str | None
    contact2_email: str | None
    website: str | None
    currency: str
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
