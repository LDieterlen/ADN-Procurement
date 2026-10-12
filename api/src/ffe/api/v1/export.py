"""Exports of a project (API.md « Exports ») : spec sheets PDF, listing PDF, issued exports."""

from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Path, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.project_file import ProjectFileRead
from ffe.services import project_file as service

router = APIRouter(prefix="/projects/{project_id}/exports", tags=["exports"])

ProjectId = Annotated[int, Path(ge=1)]


def _pdf(name: str, data: bytes) -> Response:
    return Response(
        content=data,
        media_type=service.PDF_MIME,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}",
            "Cache-Control": "no-store",
        },
    )


@router.get("", operation_id="listProjectExports")
def list_exports(project_id: ProjectId, session: SessionDep) -> list[ProjectFileRead]:
    return [service.to_read(row) for row in service.list_exports(session, project_id)]


@router.get(
    "/sheets.pdf",
    operation_id="exportSheets",
    response_class=Response,
    responses={200: {"content": {service.PDF_MIME: {}}}},
)
def export_sheets(project_id: ProjectId, session: SessionDep, deps: DepsDep) -> Response:
    row, data = service.issue_sheets(session, deps.settings.files_dir, project_id, deps.clock)
    return _pdf(row.file.original_name, data)


@router.get(
    "/list.pdf",
    operation_id="exportList",
    response_class=Response,
    responses={200: {"content": {service.PDF_MIME: {}}}},
)
def export_list(project_id: ProjectId, session: SessionDep, deps: DepsDep) -> Response:
    row, data = service.issue_list(session, deps.settings.files_dir, project_id, deps.clock)
    return _pdf(row.file.original_name, data)
