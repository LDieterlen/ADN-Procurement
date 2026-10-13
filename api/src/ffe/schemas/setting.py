"""`setting` schemas (DATA_MODEL §4.1): one row, read and patched through `/settings`."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Prefix = Annotated[str, Field(max_length=10, pattern=r"^[A-Z0-9-]*$")]
Name = Annotated[str, Field(max_length=200)]
Address = Annotated[str | None, Field(max_length=1000)]
Email = Annotated[str | None, Field(max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
Phone = Annotated[str | None, Field(max_length=40)]


def _clean(value: Any) -> Any:
    """Strips text; empty text becomes None."""
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    return stripped if stripped else None


class SettingUpdate(BaseSchema):
    project_code_prefix: Prefix | None = None
    agency_name: Name | None = None
    agency_address: Address = None
    agency_email: Email = None
    agency_phone: Phone = None

    @field_validator("project_code_prefix", mode="before")
    @classmethod
    def prefix_cannot_be_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("agency_name", mode="before")
    @classmethod
    def name_cannot_be_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value.strip() if isinstance(value, str) else value

    @field_validator("agency_address", "agency_email", "agency_phone", mode="before")
    @classmethod
    def strip_optional(cls, value: Any) -> Any:
        return _clean(value)


class SettingRead(BaseSchema):
    id: int
    base_currency: str
    seed_category_version: int
    project_code_prefix: str
    agency_name: str
    agency_address: str | None
    agency_email: str | None
    agency_phone: str | None
    extension_token: str | None  # ADR-0017, shown once on the settings page
    created_at: str
    updated_at: str
