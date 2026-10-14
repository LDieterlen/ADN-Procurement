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
    image_urls: list[str] = []  # every photo of the page, first = image_url
    price_cents: int | None  # as displayed on the page, usually taxes included
    currency: str | None
    description: str | None
    source: Literal["json-ld", "opengraph", "title"]
    type_code: str | None = None  # guessed from name and breadcrumb; the user checks
    dimensions: str | None = None
    lead_time: str | None = None
    finish: str | None = None  # colour and material announced by the page


class CaptureImageIn(BaseSchema):
    url: Url


def _lines(text: str | None) -> list[str]:
    return [line for line in (text or "").split("\n") if line]


class CaptureRead(BaseSchema):
    """A page sent by the browser extension, waiting on « Nouvel article »."""

    id: int
    preview: CapturePreviewRead
    images: list[FileRead]  # downloaded photos, page order
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
                image_urls=_lines(capture.image_urls),
                price_cents=capture.price_cents,
                currency=capture.currency,
                description=capture.description,
                source=capture.source,
                type_code=capture.type_code,
                dimensions=capture.dimensions,
                lead_time=capture.lead_time,
                finish=capture.finish,
            ),
            images=[FileRead.model_validate(i.file) for i in capture.images],
            created_at=capture.created_at,
        )
