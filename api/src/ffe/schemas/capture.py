"""« Coller une adresse » DTOs (ADR-0014) and the extension inbox (ADR-0017)."""

from typing import Annotated, Any, Literal

from pydantic import Field

from ffe.schemas.base import BaseSchema
from ffe.schemas.file import FileRead

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


class CaptureRead(BaseSchema):
    """A page sent by the browser extension, waiting on « Nouvel article »."""

    id: int
    preview: CapturePreviewRead
    image: FileRead | None
    created_at: str

    @classmethod
    def from_model(cls, capture: Any) -> CaptureRead:
        return cls(
            id=capture.id,
            preview=CapturePreviewRead(
                url=capture.url,
                name=capture.name,
                brand=capture.brand,
                reference=capture.reference,
                image_url=capture.image_url,
                price_cents=capture.price_cents,
                currency=capture.currency,
                description=capture.description,
                source=capture.source,
            ),
            image=FileRead.model_validate(capture.image) if capture.image else None,
            created_at=capture.created_at,
        )
