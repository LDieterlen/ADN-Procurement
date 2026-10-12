"""« Coller une adresse » DTOs (ADR-0014)."""

from typing import Annotated, Literal

from pydantic import Field

from ffe.schemas.base import BaseSchema

Url = Annotated[str, Field(min_length=8, max_length=2000)]


class CapturePreviewRead(BaseSchema):
    url: str
    name: str | None
    brand: str | None
    reference: str | None
    image_url: str | None
    price_cents: int | None  # as displayed on the page, usually taxes included
    currency: str | None
    description: str | None
    source: Literal["json-ld", "opengraph", "title"]


class CaptureImageIn(BaseSchema):
    url: Url
