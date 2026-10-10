"""`category` schemas: level-1 (code) or child (parentId); flat list with parentId for the tree."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Name = Annotated[str, Field(min_length=1, max_length=100)]
Code = Annotated[str | None, Field(pattern=r"^[A-Z]{2,4}$")]


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class CategoryCreate(BaseSchema):
    name: Name
    parent_id: int | None = None  # None = level 1, then `code` is required
    code: Code = None
    sort_order: int = 0

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return _strip(value)

    @field_validator("code", mode="before")
    @classmethod
    def upper_code(cls, value: Any) -> Any:
        return value.strip().upper() if isinstance(value, str) and value.strip() else None


class CategoryUpdate(BaseSchema):
    """Name and order only: code and parent are immutable (item codes depend on them, D6a.9)."""

    name: Name | None = None
    sort_order: int | None = None

    @field_validator("name", "sort_order", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)


class CategoryRead(BaseSchema):
    id: int
    parent_id: int | None
    code: str | None
    name: str
    sort_order: int
    archived_at: str | None
    created_at: str
    updated_at: str
