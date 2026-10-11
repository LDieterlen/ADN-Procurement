"""Purchase orders: nested list/create under a project, flat `/purchase-orders/{id}`, lines, issue,
status, files (API.md « Bons de commande »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.purchase_order import (
    PoCreate,
    PoFileAttach,
    PoLinesAdd,
    PoLineUpdate,
    PoRead,
    PoStatusChange,
    PoUpdate,
)
from ffe.services import purchase_order as service

router = APIRouter(tags=["purchase-orders"])

ProjectId = Annotated[int, Path(ge=1)]
PoId = Annotated[int, Path(ge=1)]
LineId = Annotated[int, Path(ge=1)]
FileId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/purchase-orders", operation_id="listPurchaseOrders")
def list_pos(project_id: ProjectId, session: SessionDep) -> list[PoRead]:
    return [service.to_read(session, po) for po in service.list_pos(session, project_id)]


@router.post(
    "/projects/{project_id}/purchase-orders", status_code=201, operation_id="createPurchaseOrder"
)
def create_po(
    project_id: ProjectId, payload: PoCreate, session: SessionDep, deps: DepsDep
) -> PoRead:
    return service.to_read(session, service.create_po(session, project_id, payload, deps.clock))


@router.get("/purchase-orders/{po_id}", operation_id="getPurchaseOrder")
def get_po(po_id: PoId, session: SessionDep) -> PoRead:
    return service.to_read(session, service.get_po(session, po_id))


@router.patch("/purchase-orders/{po_id}", operation_id="updatePurchaseOrder")
def update_po(po_id: PoId, payload: PoUpdate, session: SessionDep, deps: DepsDep) -> PoRead:
    return service.to_read(session, service.update_po(session, po_id, payload, deps.clock))


@router.delete("/purchase-orders/{po_id}", status_code=204, operation_id="deletePurchaseOrder")
def delete_po(po_id: PoId, session: SessionDep) -> Response:
    service.delete_po(session, po_id)
    return Response(status_code=204)


@router.post("/purchase-orders/{po_id}/issue", operation_id="issuePurchaseOrder")
def issue_po(po_id: PoId, session: SessionDep, deps: DepsDep) -> PoRead:
    return service.to_read(
        session, service.issue_po(session, po_id, deps.clock, deps.clock().date())
    )


@router.post("/purchase-orders/{po_id}/status", operation_id="changePurchaseOrderStatus")
def change_status(
    po_id: PoId, payload: PoStatusChange, session: SessionDep, deps: DepsDep
) -> PoRead:
    return service.to_read(session, service.change_status(session, po_id, payload, deps.clock))


@router.post(
    "/purchase-orders/{po_id}/lines", status_code=201, operation_id="addPurchaseOrderLines"
)
def add_lines(po_id: PoId, payload: PoLinesAdd, session: SessionDep, deps: DepsDep) -> PoRead:
    return service.to_read(session, service.add_lines(session, po_id, payload, deps.clock))


@router.patch("/purchase-order-lines/{line_id}", operation_id="updatePurchaseOrderLine")
def update_line(
    line_id: LineId, payload: PoLineUpdate, session: SessionDep, deps: DepsDep
) -> PoRead:
    return service.to_read(session, service.update_line(session, line_id, payload, deps.clock))


@router.delete("/purchase-order-lines/{line_id}", operation_id="deletePurchaseOrderLine")
def delete_line(line_id: LineId, session: SessionDep, deps: DepsDep) -> PoRead:
    return service.to_read(session, service.delete_line(session, line_id, deps.clock))


@router.post(
    "/purchase-orders/{po_id}/files", status_code=201, operation_id="attachPurchaseOrderFile"
)
def attach_file(po_id: PoId, payload: PoFileAttach, session: SessionDep, deps: DepsDep) -> PoRead:
    return service.to_read(session, service.attach_file(session, po_id, payload, deps.clock))


@router.delete("/purchase-orders/{po_id}/files/{file_id}", operation_id="detachPurchaseOrderFile")
def detach_file(po_id: PoId, file_id: FileId, session: SessionDep, deps: DepsDep) -> PoRead:
    return service.to_read(
        session,
        service.detach_file(session, po_id, file_id, deps.settings.files_dir, deps.clock),
    )
