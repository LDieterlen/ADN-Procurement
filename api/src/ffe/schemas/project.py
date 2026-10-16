"""`project` schemas (DATA_MODEL §4.3). Status changes go through `POST /projects/{id}/status`."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, IsoDate, strip_text

ProjectStatus = Literal["prospect", "active", "delivered", "closed", "cancelled"]

Name = Annotated[str, Field(min_length=1, max_length=200)]
Code = Annotated[str, Field(min_length=1, max_length=40)]
Short = Annotated[str | None, Field(max_length=500)]
Long = Annotated[str | None, Field(max_length=4000)]


class ProjectCreate(BaseSchema):
    name: Name
    client_id: int
    code: Code | None = None  # None = generated `<prefix><YYYY>-NNN` (D6c.1)
    site_address: Short = None
    due_on: IsoDate = None
    notes: Long = None
    procurement_name: Short = None  # the procurement company, top right of the sheets
    procurement_logo_file_id: int | None = None  # its logo, an image uploaded by POST /files
    # The global envelope, created with the project (ADR-0012).
    global_budget_cents: Annotated[int | None, Field(ge=0)] = None

    @field_validator("name", "code", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return strip_text(value)


class ProjectUpdate(BaseSchema):
    name: Name | None = None
    client_id: int | None = None
    code: Code | None = None
    site_address: Short = None
    due_on: IsoDate = None
    notes: Long = None
    procurement_name: Short = None
    procurement_logo_file_id: int | None = None

    @field_validator("name", "client_id", "code", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return strip_text(value)


class ProjectStatusChange(BaseSchema):
    status: ProjectStatus


class DiffusionRead(BaseSchema):
    id: int
    number: int
    issued_at: str


class ProjectRead(BaseSchema):
    id: int
    code: str
    name: str
    client_id: int
    status: ProjectStatus
    site_address: str | None
    due_on: str | None
    notes: str | None
    diffusion_count: int = 0  # official diffusions (ADR-0022); 0 = everything still free
    last_diffusion: DiffusionRead | None = None
    procurement_name: str | None
    procurement_logo_file_id: int | None
    created_at: str
    updated_at: str


class ProjectListRead(ProjectRead):
    """A row of the projects list: the project plus its budget figures (computed, never stored)."""

    budget_cents: int | None
    specified_cents: int
    item_count: int
