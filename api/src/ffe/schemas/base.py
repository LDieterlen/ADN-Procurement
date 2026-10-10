"""Common schema base: snake_case in Python, camelCase in JSON (ARCHITECTURE §4)."""

from datetime import date
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    """JSON in/out is camelCase (FastAPI validates and serialises by alias);
    `model_dump()` stays snake_case so services can hand the result to SQLAlchemy models."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class Page[T](BaseSchema):
    """Paginated catalogue list (API.md « Listes ») : `{items, total}`."""

    items: list[T]
    total: int


def _check_civil_date(value: str | None) -> str | None:
    """`YYYY-MM-DD` that really exists (the GLOB CHECK in the base only checks the shape)."""
    if value is not None:
        date.fromisoformat(value)
    return value


IsoDate = Annotated[
    str | None, Field(pattern=r"^\d{4}-\d{2}-\d{2}$"), AfterValidator(_check_civil_date)
]
