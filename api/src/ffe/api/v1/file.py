"""`/files`: multipart upload deduplicated by sha256, and content download (API.md « Fichiers »)."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import APIRouter, Path, Response, UploadFile
from fastapi.responses import FileResponse

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.file import FileRead
from ffe.services import file as service

router = APIRouter(prefix="/files", tags=["files"])

FileId = Annotated[int, Path(ge=1)]
CHUNK = 1024 * 1024


def _chunks(upload: UploadFile) -> Iterator[bytes]:
    while True:
        chunk = upload.file.read(CHUNK)
        if not chunk:
            return
        yield chunk


@router.post("", operation_id="uploadFile", status_code=201, responses={200: {"model": FileRead}})
def upload_file(
    file: UploadFile, session: SessionDep, deps: DepsDep, response: Response
) -> FileRead:
    """201 when the bytes are new, 200 when the same sha256 already exists (same body)."""
    settings = deps.settings
    stored, created = service.store_upload(
        session,
        settings.files_dir,
        _chunks(file),
        file.filename or "",
        settings.max_upload_bytes,
        deps.clock,
    )
    if not created:
        response.status_code = 200
    return FileRead.model_validate(stored)


@router.get("/{file_id}/content", operation_id="getFileContent", response_class=FileResponse)
def get_file_content(file_id: FileId, session: SessionDep, deps: DepsDep) -> FileResponse:
    stored = service.get_file(session, file_id)
    return FileResponse(
        service.content_path(deps.settings.files_dir, stored),
        media_type=stored.mime_type,
        filename=stored.original_name,
        content_disposition_type="inline",
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )
