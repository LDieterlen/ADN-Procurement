"""Exports of a project (API.md « Exports ») : spec sheets PDF, listing PDF, issued exports."""

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response

from ffe.api.responses import PDF_RESPONSE, PrintFlag, pdf_response
from ffe.deps import DepsDep, SessionDep
from ffe.schemas.project_file import ProjectFileRead, SheetsIssue
from ffe.services import diffusion as diffusion_service
from ffe.services import project_file as service

router = APIRouter(prefix="/projects/{project_id}/exports", tags=["exports"])

ProjectId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listProjectExports")
def list_exports(project_id: ProjectId, session: SessionDep) -> list[ProjectFileRead]:
    return [service.to_read(session, row) for row in service.list_exports(session, project_id)]


@router.post("/sheets", operation_id="issueSheets")
def issue_sheets(
    project_id: ProjectId, payload: SheetsIssue, session: SessionDep, deps: DepsDep
) -> list[ProjectFileRead]:
    """« Fiches PDF » (ADR-0022): issues the sheets on each paper asked, as an official diffusion
    (indices moved) or a working document; the PDFs are then downloaded from `/files/{id}`."""
    rows = diffusion_service.issue_sheets(
        session,
        deps.settings.files_dir,
        project_id,
        deps.clock,
        diffuse=payload.diffuse,
        papers=list(payload.papers),
        include_options=payload.include_options,
        hide_agency_name=payload.hide_agency_name,
        hide_studio=payload.hide_studio,
        hide_agency_logo=payload.hide_agency_logo,
    )
    return [service.to_read(session, row) for row in rows]


@router.get(
    "/list.pdf",
    operation_id="exportList",
    response_class=Response,
    responses=PDF_RESPONSE,
)
def export_list(
    project_id: ProjectId,
    session: SessionDep,
    deps: DepsDep,
    printable: PrintFlag = False,
    profile: Annotated[int | None, Query(ge=1)] = None,
    options: bool = False,
) -> Response:
    """Listing PDF: the columns of listing profile `profile` (ADR-0023), all of them without;
    the options only with `options=true`."""
    row, data = service.issue_list(
        session, deps.settings.files_dir, project_id, deps.clock, printable, profile, options
    )
    return pdf_response(row.file.original_name, data)
