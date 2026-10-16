"""`listing_profile` schemas (ADR-0023): a name and the columns a listing prints."""

import json
from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.listing import ListingColumn, in_catalogue_order
from ffe.schemas.base import BaseSchema, strip_text

Name = Annotated[str, Field(min_length=1, max_length=100)]
Columns = Annotated[list[ListingColumn], Field(min_length=1)]


class ListingProfileCreate(BaseSchema):
    name: Name
    columns: Columns

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return strip_text(value)


class ListingProfileUpdate(BaseSchema):
    name: Name | None = None
    columns: Columns | None = None
    sort_order: int | None = None

    @field_validator("name", "columns", "sort_order", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return strip_text(value)


class ListingProfileRead(BaseSchema):
    id: int
    name: str
    columns: list[ListingColumn]
    sort_order: int
    created_at: str
    updated_at: str

    @field_validator("columns", mode="before")
    @classmethod
    def from_json(cls, value: Any) -> Any:
        """Stored as a JSON array; printed in the catalogue order."""
        return in_catalogue_order(json.loads(value) if isinstance(value, str) else value)


class ListingColumnRead(BaseSchema):
    key: ListingColumn
    label: str
