"""`location` schemas (DATA_MODEL §4.4, ADR-0013): code, name, zone, level, multiplier."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, strip_text

Code = Annotated[str, Field(min_length=1, max_length=20)]
Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Multiplier = Annotated[int, Field(ge=1, le=100000)]


def _clean(value: Any) -> Any:
    """Optional texts: stripped, empty → None."""
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


class LocationCreate(BaseSchema):
    code: Code
    name: Name
    zone: Short = None
    level: Short = None
    multiplier: Multiplier = 1
    sort_order: int | None = None  # None = after the last location

    @field_validator("code", "name", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return strip_text(value)

    @field_validator("zone", "level", mode="before")
    @classmethod
    def clean_optional(cls, value: Any) -> Any:
        return _clean(value)


class LocationUpdate(BaseSchema):
    code: Code | None = None
    name: Name | None = None
    zone: Short = None
    level: Short = None
    multiplier: Multiplier | None = None
    sort_order: int | None = None

    @field_validator("code", "name", "multiplier", "sort_order", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return strip_text(value)

    @field_validator("zone", "level", mode="before")
    @classmethod
    def clean_optional(cls, value: Any) -> Any:
        return _clean(value)


class LocationReorder(BaseSchema):
    location_ids: list[int]


class LocationRead(BaseSchema):
    id: int
    project_id: int
    code: str
    name: str
    zone: str | None
    level: str | None
    multiplier: int
    sort_order: int
    archived_at: str | None
    created_at: str
    updated_at: str
