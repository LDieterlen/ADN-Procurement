"""Installation sheets (ADR-0024): parts of a room, their plan, the ordered articles round it,
and their A3 PDF (downloaded, never stored)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response

from ffe.api.responses import PDF_RESPONSE, PrintFlag, pdf_response
from ffe.deps import DepsDep, SessionDep
from ffe.schemas.installation_sheet import (
    InstallationSheetCreate,
    InstallationSheetDetail,
    InstallationSheetItemsSet,
    InstallationSheetRead,
    InstallationSheetUpdate,
)
from ffe.services import installation_pdf
from ffe.services import installation_sheet as service

router = APIRouter(tags=["installation"])

ProjectId = Annotated[int, Path(ge=1)]
SheetId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/installation-sheets", operation_id="listInstallationSheets")
def list_sheets(project_id: ProjectId, session: SessionDep) -> list[InstallationSheetRead]:
    return [service.to_read(s) for s in service.list_sheets(session, project_id)]


@router.post(
    "/projects/{project_id}/installation-sheets",
    status_code=201,
    operation_id="createInstallationSheet",
)
def create_sheet(
    project_id: ProjectId, payload: InstallationSheetCreate, session: SessionDep, deps: DepsDep
) -> InstallationSheetDetail:
    sheet = service.create_sheet(session, project_id, payload, deps.clock)
    return service.detail(session, sheet.id)


@router.get(
    "/projects/{project_id}/installation.pdf",
    operation_id="exportInstallation",
    response_class=Response,
    responses=PDF_RESPONSE,
)
def export_installation(
    project_id: ProjectId,
    session: SessionDep,
    deps: DepsDep,
    printable: PrintFlag = False,
    location_id: Annotated[int | None, Query(alias="locationId", ge=1)] = None,
) -> Response:
    """Every sheet of the project, or of one room with `locationId`."""
    name, data = installation_pdf.project_pdf(
        session, deps.settings.files_dir, project_id, deps.clock, location_id, printable
    )
    return pdf_response(name, data)


@router.get("/installation-sheets/{sheet_id}", operation_id="getInstallationSheet")
def get_sheet(sheet_id: SheetId, session: SessionDep) -> InstallationSheetDetail:
    return service.detail(session, sheet_id)


@router.patch("/installation-sheets/{sheet_id}", operation_id="updateInstallationSheet")
def update_sheet(
    sheet_id: SheetId, payload: InstallationSheetUpdate, session: SessionDep, deps: DepsDep
) -> InstallationSheetDetail:
    service.update_sheet(session, sheet_id, payload, deps.clock)
    return service.detail(session, sheet_id)


@router.put("/installation-sheets/{sheet_id}/items", operation_id="setInstallationSheetItems")
def set_items(
    sheet_id: SheetId, payload: InstallationSheetItemsSet, session: SessionDep, deps: DepsDep
) -> InstallationSheetDetail:
    service.set_items(session, sheet_id, payload, deps.clock)
    return service.detail(session, sheet_id)


@router.delete(
    "/installation-sheets/{sheet_id}", status_code=204, operation_id="deleteInstallationSheet"
)
def delete_sheet(sheet_id: SheetId, session: SessionDep) -> Response:
    service.delete_sheet(session, sheet_id)
    return Response(status_code=204)


@router.get(
    "/installation-sheets/{sheet_id}/pdf",
    operation_id="exportInstallationSheet",
    response_class=Response,
    responses=PDF_RESPONSE,
)
def export_sheet(
    sheet_id: SheetId, session: SessionDep, deps: DepsDep, printable: PrintFlag = False
) -> Response:
    name, data = installation_pdf.sheet_pdf(
        session, deps.settings.files_dir, sheet_id, deps.clock, printable
    )
    return pdf_response(name, data)
