"""Price-list imports (API.md « Import tarifs »): multipart file + form fields, preview then commit."""

import json
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile
from pydantic import ValidationError

from ffe.deps import DepsDep, SessionDep
from ffe.errors import ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.schemas.product_import import (
    ImportBatchRead,
    ImportCommitRead,
    ImportMapping,
    ImportPreviewRead,
)
from ffe.services import product_import as service

router = APIRouter(prefix="/imports/products", tags=["imports"])


def _mapping(text: str | None) -> ImportMapping | None:
    if not text:
        return None
    try:
        return ImportMapping.model_validate(json.loads(text))
    except (ValueError, ValidationError) as error:
        raise ValidationAppError([ErrorDetail("mapping", fr.IMPORT_MAPPING_INVALID)]) from error


async def _bytes(upload: UploadFile, limit: int) -> tuple[bytes, str]:
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise ValidationAppError([ErrorDetail("file", fr.IMPORT_FILE_TYPE)])
    return data, upload.filename or "tarif"


@router.post("/preview", operation_id="previewProductImport")
async def preview_import(
    session: SessionDep,
    deps: DepsDep,
    file: Annotated[UploadFile, File()],
    supplier_id: Annotated[int, Form(alias="supplierId")],
    mapping: Annotated[str | None, Form()] = None,
) -> ImportPreviewRead:
    data, name = await _bytes(file, deps.settings.max_upload_bytes)
    return service.preview(session, supplier_id, data, name, _mapping(mapping))


@router.post("/commit", operation_id="commitProductImport", status_code=201)
async def commit_import(
    session: SessionDep,
    deps: DepsDep,
    file: Annotated[UploadFile, File()],
    supplier_id: Annotated[int, Form(alias="supplierId")],
    mapping: Annotated[str | None, Form()] = None,
    mark_missing_discontinued: Annotated[bool, Form(alias="markMissingDiscontinued")] = False,
) -> ImportCommitRead:
    data, name = await _bytes(file, deps.settings.max_upload_bytes)
    return service.commit(
        session,
        deps.settings.files_dir,
        supplier_id,
        data,
        name,
        _mapping(mapping),
        mark_missing_discontinued,
        deps.clock,
    )


@router.get("/batches", operation_id="listProductImportBatches")
def list_batches(
    session: SessionDep,
    supplier_id: Annotated[int | None, Query(alias="supplierId", ge=1)] = None,
) -> list[ImportBatchRead]:
    return [service.batch_read(b) for b in service.list_batches(session, supplier_id)]


@router.get("/mapping", operation_id="getProductImportMapping")
def get_mapping(
    session: SessionDep, supplier_id: Annotated[int, Query(alias="supplierId", ge=1)]
) -> ImportMapping | None:
    return service.saved_mapping(service.supplier_or_422(session, supplier_id))
