"""`/captures` (ADR-0014, ADR-0017): read a product page on demand, download its image, and the
inbox fed by the browser extension (token `X-FFE-Token`)."""

from typing import Annotated

from fastapi import APIRouter, Form, Header, Path, Query, UploadFile

from ffe.deps import DepsDep, SessionDep
from ffe.errors import ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.schemas.capture import CaptureImageIn, CapturePreviewRead, CaptureRead
from ffe.schemas.file import FileRead
from ffe.services import capture as service

router = APIRouter(prefix="/captures", tags=["captures"])

CaptureId = Annotated[int, Path(ge=1)]
Token = Annotated[str | None, Header(alias="X-FFE-Token")]
MAX_IMAGE_BYTES = service.MAX_BYTES


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


@router.get("", operation_id="listCaptures")
def list_captures(session: SessionDep) -> list[CaptureRead]:
    return [CaptureRead.from_model(c) for c in service.list_captures(session)]


@router.post("", status_code=201, operation_id="createCapture")
def create_capture(
    session: SessionDep,
    deps: DepsDep,
    url: Annotated[str, Form(min_length=8, max_length=2000)],
    html: UploadFile,
    x_ffe_token: Token = None,
    image: UploadFile | None = None,
) -> CaptureRead:
    """From the extension: the page as displayed (multipart `url`, `html` as a file part — a form
    field is capped at 1 Mo by Starlette, a rendered page is often bigger — optional `image`)."""
    service.require_extension_token(session, x_ffe_token)
    page = html.file.read(service.MAX_HTML_BYTES + 1)
    if len(page) > service.MAX_HTML_BYTES:
        raise ValidationAppError([ErrorDetail("html", fr.CAPTURE_HTML_TOO_LARGE)])
    data = image.file.read(MAX_IMAGE_BYTES + 1) if image is not None else None
    if data is not None and len(data) > MAX_IMAGE_BYTES:
        data = None  # too large: the server will try the URL itself
    capture = service.create_capture(
        session,
        deps.settings.files_dir,
        url,
        page.decode("utf-8", errors="replace"),
        deps.clock,
        deps.fetch_url,
        data or None,
    )
    return CaptureRead.from_model(capture)


@router.post("/{capture_id}/image", operation_id="attachCaptureImage")
def attach_capture_image(
    capture_id: CaptureId,
    image: UploadFile,
    session: SessionDep,
    deps: DepsDep,
    x_ffe_token: Token = None,
) -> CaptureRead:
    """From the extension, when the server could not download the image itself."""
    service.require_extension_token(session, x_ffe_token)
    data = image.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise ValidationAppError([ErrorDetail("image", fr.CAPTURE_TOO_LARGE)])
    capture = service.attach_capture_image(
        session, deps.settings.files_dir, capture_id, data, image.filename or "image", deps.clock
    )
    return CaptureRead.from_model(capture)


@router.delete("/{capture_id}", status_code=204, operation_id="deleteCapture")
def delete_capture(capture_id: CaptureId, session: SessionDep, deps: DepsDep) -> None:
    service.delete_capture(session, deps.settings.files_dir, capture_id)
