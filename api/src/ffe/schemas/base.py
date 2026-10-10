"""Common schema base: snake_case in Python, camelCase in JSON (ARCHITECTURE §4)."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    """JSON in/out is camelCase (FastAPI validates and serialises by alias);
    `model_dump()` stays snake_case so services can hand the result to SQLAlchemy models."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
