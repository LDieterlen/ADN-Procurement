"""`choice` schemas: editable value lists (family, usage, prestation)."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

ChoiceList = Literal["family", "usage", "prestation"]
Name = Annotated[str, Field(min_length=1, max_length=100)]


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ChoiceCreate(BaseSchema):
    list: ChoiceList
    name: Name
    sort_order: int | None = None  # None = after the last one

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return _strip(value)


class ChoiceUpdate(BaseSchema):
    """Label and order only: the code is kept by articles, envelopes and professionals."""

    name: Name | None = None
    sort_order: int | None = None

    @field_validator("name", "sort_order", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)


class ChoiceRead(BaseSchema):
    id: int
    list: ChoiceList
    code: str
    name: str
    sort_order: int
    archived_at: str | None
    created_at: str
    updated_at: str
