"""`project` schemas (DATA_MODEL §4.3). Status changes go through `POST /projects/{id}/status`."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, IsoDate

ProjectStatus = Literal["prospect", "active", "delivered", "closed", "cancelled"]

Name = Annotated[str, Field(min_length=1, max_length=200)]
Code = Annotated[str, Field(min_length=1, max_length=40)]
Short = Annotated[str | None, Field(max_length=500)]
Long = Annotated[str | None, Field(max_length=4000)]


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ProjectCreate(BaseSchema):
    name: Name
    client_id: int
    code: Code | None = None  # None = generated `<prefix><YYYY>-NNN` (D6c.1)
    site_address: Short = None
    due_on: IsoDate = None
    notes: Long = None
    # The global envelope, created with the project (ADR-0012).
    global_budget_cents: Annotated[int | None, Field(ge=0)] = None

    @field_validator("name", "code", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ProjectUpdate(BaseSchema):
    name: Name | None = None
    client_id: int | None = None
    code: Code | None = None
    site_address: Short = None
    due_on: IsoDate = None
    notes: Long = None

    @field_validator("name", "client_id", "code", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)


class ProjectStatusChange(BaseSchema):
    status: ProjectStatus


class ProjectRead(BaseSchema):
    id: int
    code: str
    name: str
    client_id: int
    status: ProjectStatus
    site_address: str | None
    due_on: str | None
    notes: str | None
    created_at: str
    updated_at: str
