"""`project` schemas (DATA_MODEL §4.3). Status changes go through `POST /projects/{id}/status`."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator, model_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, IsoDate

ProjectStatus = Literal["prospect", "active", "delivered", "closed", "cancelled"]

Name = Annotated[str, Field(min_length=1, max_length=200)]
Code = Annotated[str, Field(min_length=1, max_length=40)]
Short = Annotated[str | None, Field(max_length=500)]
Long = Annotated[str | None, Field(max_length=4000)]
Bp = Annotated[int, Field(ge=0, le=10000)]

DUE_BEFORE_START = "La date de fin doit suivre la date de début."


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ProjectCreate(BaseSchema):
    name: Name
    client_id: int
    code: Code | None = None  # None = generated `<prefix><YYYY>-NNN` (D6c.1)
    site_address: Short = None
    delivery_address: Short = None
    delivery_contact: Short = None
    default_vat_bp: Bp | None = None  # None = copied from setting.default_vat_bp
    contingency_bp: Bp | None = None  # None = copied from setting.default_contingency_bp (D8.2)
    start_on: IsoDate = None
    due_on: IsoDate = None
    notes: Long = None
    global_budget_cents: Annotated[int | None, Field(ge=0)] = (
        None  # ADR-0012: envelope created with the project
    )

    @field_validator("name", "code", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)

    @model_validator(mode="after")
    def dates_ordered(self) -> ProjectCreate:
        if self.start_on and self.due_on and self.due_on < self.start_on:
            raise ValueError(DUE_BEFORE_START)
        return self


class ProjectUpdate(BaseSchema):
    name: Name | None = None
    client_id: int | None = None
    code: Code | None = None
    site_address: Short = None
    delivery_address: Short = None
    delivery_contact: Short = None
    default_vat_bp: Bp | None = None
    contingency_bp: Bp | None = None
    start_on: IsoDate = None
    due_on: IsoDate = None
    notes: Long = None

    @field_validator("name", "client_id", "code", "default_vat_bp", "contingency_bp", mode="before")
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
    delivery_address: str | None
    delivery_contact: str | None
    default_vat_bp: int
    contingency_bp: int
    start_on: str | None
    due_on: str | None
    notes: str | None
    created_at: str
    updated_at: str
