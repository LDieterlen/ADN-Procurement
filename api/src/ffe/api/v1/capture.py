"""`/captures` (ADR-0014): read a product page, download its image — on demand, one at a time."""

from typing import Annotated

from fastapi import APIRouter, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.capture import CaptureImageIn, CapturePreviewRead
from ffe.schemas.file import FileRead
from ffe.services import capture as service

router = APIRouter(prefix="/captures", tags=["captures"])


@router.get("/preview", operation_id="previewCapture")
def preview_capture(
    url: Annotated[str, Query(min_length=8, max_length=2000)], deps: DepsDep
) -> CapturePreviewRead:
    found = service.preview(url, deps.fetch_url)
    return CapturePreviewRead(
        url=url.strip(),
        name=found.name,
        brand=found.brand,
        reference=found.reference,
        image_url=found.image_url,
        price_cents=found.price_cents,
        currency=found.currency,
        description=found.description,
        source=found.source,  # type: ignore[arg-type]
    )


@router.post("/image", status_code=201, operation_id="captureImage")
def capture_image(payload: CaptureImageIn, session: SessionDep, deps: DepsDep) -> FileRead:
    return FileRead.model_validate(
        service.store_image(
            session, deps.settings.files_dir, payload.url, deps.clock, deps.fetch_url
        )
    )
