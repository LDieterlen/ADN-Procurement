"""`setting` schemas (DATA_MODEL §4.1): one row, read and patched through `/settings`."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Bp = Annotated[int, Field(ge=0, le=10000)]
Prefix = Annotated[str, Field(max_length=10, pattern=r"^[A-Z0-9-]*$")]
Name = Annotated[str, Field(max_length=200)]
Address = Annotated[str | None, Field(max_length=1000)]
Email = Annotated[str | None, Field(max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
Phone = Annotated[str | None, Field(max_length=40)]
Siret = Annotated[str | None, Field(pattern=r"^[0-9]{14}$")]
VatNumber = Annotated[str | None, Field(pattern=r"^[A-Z]{2}[0-9A-Z]{2,13}$")]


def _clean(value: Any) -> Any:
    """Strips text; empty text becomes None; SIRET and VAT numbers lose their spaces."""
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    return stripped if stripped else None


class SettingUpdate(BaseSchema):
    default_vat_bp: Bp | None = None
    default_contingency_bp: Bp | None = None
    project_code_prefix: Prefix | None = None
    agency_name: Name | None = None
    agency_address: Address = None
    agency_email: Email = None
    agency_phone: Phone = None
    agency_siret: Siret = None
    agency_vat_number: VatNumber = None

    @field_validator("default_vat_bp", "default_contingency_bp", mode="before")
    @classmethod
    def numbers_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value

    @field_validator("project_code_prefix", "agency_name", mode="before")
    @classmethod
    def texts_cannot_be_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("agency_address", "agency_email", "agency_phone", mode="before")
    @classmethod
    def strip_optional(cls, value: Any) -> Any:
        return _clean(value)

    @field_validator("agency_siret", "agency_vat_number", mode="before")
    @classmethod
    def strip_spaces(cls, value: Any) -> Any:
        cleaned = _clean(value)
        return cleaned.replace(" ", "").upper() if isinstance(cleaned, str) else cleaned


class SettingRead(BaseSchema):
    id: int
    default_vat_bp: int
    base_currency: str
    seed_category_version: int
    project_code_prefix: str
    default_contingency_bp: int
    agency_name: str
    agency_address: str | None
    agency_email: str | None
    agency_phone: str | None
    agency_siret: str | None
    agency_vat_number: str | None
    created_at: str
    updated_at: str
