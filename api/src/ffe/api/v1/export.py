"""Exports of a project (API.md « Exports ») : xlsx schedule, list of issued exports."""

from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Path, Query, Response

from ffe.deps import DepsDep, SessionDep
from ffe.exports.schedule_xlsx import Variant
from ffe.schemas.project_file import ProjectFileRead
from ffe.services import project_file as service

router = APIRouter(prefix="/projects/{project_id}/exports", tags=["exports"])

ProjectId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listProjectExports")
def list_exports(project_id: ProjectId, session: SessionDep) -> list[ProjectFileRead]:
    return [service.to_read(row) for row in service.list_exports(session, project_id)]


@router.get(
    "/book.pdf",
    operation_id="exportBook",
    response_class=Response,
    responses={200: {"content": {service.PDF_MIME: {}}}},
)
def export_book(project_id: ProjectId, session: SessionDep, deps: DepsDep) -> Response:
    row, data = service.issue_book(session, deps.settings.files_dir, project_id, deps.clock)
    return Response(
        content=data,
        media_type=service.PDF_MIME,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(row.file.original_name)}",
            "Cache-Control": "no-store",
        },
    )


@router.get(
    "/schedule.xlsx",
    operation_id="exportSchedule",
    response_class=Response,
    responses={200: {"content": {service.XLSX_MIME: {}}}},
)
def export_schedule(
    project_id: ProjectId,
    session: SessionDep,
    deps: DepsDep,
    variant: Annotated[Variant, Query()] = "internal",
) -> Response:
    row, data = service.issue_schedule(
        session, deps.settings.files_dir, project_id, variant, deps.clock
    )
    name = row.file.original_name
    return Response(
        content=data,
        media_type=service.XLSX_MIME,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}",
            "Cache-Control": "no-store",
        },
    )
