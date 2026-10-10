"""`manufacturer` schemas."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=2000)]


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ManufacturerCreate(BaseSchema):
    name: Name
    website: Short = None
    notes: Long = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return _strip(value)


class ManufacturerUpdate(BaseSchema):
    name: Name | None = None
    website: Short = None
    notes: Long = None

    @field_validator("name", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)


class ManufacturerRead(BaseSchema):
    id: int
    name: str
    website: str | None
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
