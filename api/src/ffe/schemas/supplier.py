"""`supplier` schemas (DATA_MODEL §4.7). Only `name` is required."""

from typing import Annotated, Any

from pydantic import Field, field_validator, model_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=2000)]
CountryCode = Annotated[str, Field(pattern=r"^[A-Z]{2}$")]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Siren = Annotated[str | None, Field(pattern=r"^[0-9]{9}$")]
Siret = Annotated[str | None, Field(pattern=r"^[0-9]{14}$")]
Email = Annotated[str | None, Field(max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
Bp = Annotated[int, Field(ge=0, le=10000)]

STRIPPED = (
    "name",
    "legal_name",
    "contact_name",
    "city",
    "postal_code",
    "vat_number",
    "siren",
    "siret",
)
SIRET_MISMATCH = "Le SIRET doit commencer par le SIREN."


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class SupplierCreate(BaseSchema):
    name: Name
    legal_name: Short = None
    country_code: CountryCode = "FR"
    siren: Siren = None
    siret: Siret = None
    vat_number: Short = None
    address_line1: Short = None
    address_line2: Short = None
    postal_code: Short = None
    city: Short = None
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    website: Short = None
    currency: Currency = "EUR"
    default_discount_bp: Bp = 0
    payment_terms: Long = None
    notes: Long = None

    @field_validator(*STRIPPED, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)

    @model_validator(mode="after")
    def siret_matches_siren(self) -> SupplierCreate:
        if self.siren and self.siret and not self.siret.startswith(self.siren):
            raise ValueError(SIRET_MISMATCH)
        return self


class SupplierUpdate(BaseSchema):
    name: Name | None = None
    legal_name: Short = None
    country_code: CountryCode | None = None
    siren: Siren = None
    siret: Siret = None
    vat_number: Short = None
    address_line1: Short = None
    address_line2: Short = None
    postal_code: Short = None
    city: Short = None
    contact_name: Short = None
    email: Email = None
    phone: Short = None
    website: Short = None
    currency: Currency | None = None
    default_discount_bp: Bp | None = None
    payment_terms: Long = None
    notes: Long = None

    @field_validator("name", "country_code", "currency", "default_discount_bp", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator(
        "legal_name",
        "contact_name",
        "city",
        "postal_code",
        "vat_number",
        "siren",
        "siret",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class SupplierRead(BaseSchema):
    id: int
    name: str
    legal_name: str | None
    country_code: str
    siren: str | None
    siret: str | None
    vat_number: str | None
    address_line1: str | None
    address_line2: str | None
    postal_code: str | None
    city: str | None
    contact_name: str | None
    email: str | None
    phone: str | None
    website: str | None
    currency: str
    default_discount_bp: int
    payment_terms: str | None
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
