"""`client` schemas: ClientCreate (POST), ClientUpdate (PATCH, all optional), ClientRead (DTO)."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

ClientKind = Literal["individual", "company"]

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=2000)]
CountryCode = Annotated[str, Field(pattern=r"^[A-Z]{2}$")]
Siren = Annotated[str | None, Field(pattern=r"^[0-9]{9}$")]
Email = Annotated[str | None, Field(max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ClientCreate(BaseSchema):
    name: Name
    kind: ClientKind = "individual"
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    address_line1: Short = None
    address_line2: Short = None
    postal_code: Short = None
    city: Short = None
    country_code: CountryCode = "FR"
    siren: Siren = None
    notes: Long = None

    @field_validator("name", "contact_name", "city", "postal_code", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ClientUpdate(BaseSchema):
    """Absent = unchanged; explicit null = cleared (nullable fields only)."""

    name: Name | None = None
    kind: ClientKind | None = None
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    address_line1: Short = None
    address_line2: Short = None
    postal_code: Short = None
    city: Short = None
    country_code: CountryCode | None = None
    siren: Siren = None
    notes: Long = None

    @field_validator("name", "kind", "country_code", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator("contact_name", "city", "postal_code", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ClientRead(BaseSchema):
    id: int
    name: str
    kind: ClientKind
    contact_name: str | None
    email: str | None
    phone: str | None
    address_line1: str | None
    address_line2: str | None
    postal_code: str | None
    city: str | None
    country_code: str
    siren: str | None
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
