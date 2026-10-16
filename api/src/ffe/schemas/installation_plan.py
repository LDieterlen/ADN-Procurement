"""`installation_plan` schemas (ADR-0024): a floor plan uploaded as an image or a PDF."""

from typing import Annotated, Any

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, strip_text

Name = Annotated[str, Field(min_length=1, max_length=100)]


class InstallationPlanCreate(BaseSchema):
    file_id: Annotated[int, Field(ge=1)]
    name: Name | None = None  # default: the uploaded file's name, without its extension

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return strip_text(value) or None


class InstallationPlanUpdate(BaseSchema):
    name: Name

    @field_validator("name", mode="before")
    @classmethod
    def required(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return strip_text(value)


class InstallationPlanRead(BaseSchema):
    id: int
    project_id: int
    name: str
    file_id: int  # the image drawn
    source_file_id: int | None  # the uploaded PDF, when it was one
    created_at: str
    updated_at: str
