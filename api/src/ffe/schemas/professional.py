"""`professional` schemas (DATA_MODEL §4.6, ADR-0015)."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, strip_text

ProfessionalKind = Annotated[str, Field(min_length=1, max_length=40)]  # code of a « prestation »
Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=2000)]
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


class ProfessionalCreate(BaseSchema):
    name: Name
    kind: ProfessionalKind = "manufacturer"
    specialty: Short = None
    contact_name: Short = None
    phone: Short = None
    mobile: Short = None
    email: Email = None
    contact2_name: Short = None
    contact2_phone: Short = None
    contact2_email: Email = None
    website: Short = None
    notes: Long = None

    @field_validator(*STRIPPED, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return strip_text(value)


class ProfessionalUpdate(BaseSchema):
    name: Name | None = None
    kind: ProfessionalKind | None = None
    specialty: Short = None
    contact_name: Short = None
    phone: Short = None
    mobile: Short = None
    email: Email = None
    contact2_name: Short = None
    contact2_phone: Short = None
    contact2_email: Email = None
    website: Short = None
    notes: Long = None

    @field_validator("name", "kind", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return strip_text(value)

    @field_validator(*STRIPPED[1:], mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return strip_text(value)


class ProfessionalRead(BaseSchema):
    id: int
    name: str
    kind: str
    specialty: str | None
    contact_name: str | None
    phone: str | None
    mobile: str | None
    email: str | None
    contact2_name: str | None
    contact2_phone: str | None
    contact2_email: str | None
    website: str | None
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
