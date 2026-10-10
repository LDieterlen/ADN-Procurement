"""`zone` schemas (DATA_MODEL §4.4)."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Code = Annotated[str, Field(min_length=1, max_length=20)]
Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=2000)]
Multiplier = Annotated[int, Field(ge=1, le=100000)]


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ZoneCreate(BaseSchema):
    code: Code
    name: Name
    kind: Short = None
    multiplier: Multiplier = 1
    sort_order: int | None = None  # None = after the last zone
    notes: Long = None

    @field_validator("code", "name", "kind", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ZoneUpdate(BaseSchema):
    code: Code | None = None
    name: Name | None = None
    kind: Short = None
    multiplier: Multiplier | None = None
    sort_order: int | None = None
    notes: Long = None

    @field_validator("code", "name", "multiplier", "sort_order", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator("kind", mode="before")
    @classmethod
    def strip_kind(cls, value: Any) -> Any:
        return _strip(value)


class ZoneReorder(BaseSchema):
    zone_ids: list[int]


class ZoneRead(BaseSchema):
    id: int
    project_id: int
    code: str
    name: str
    kind: str | None
    multiplier: int
    sort_order: int
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
