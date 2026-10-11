"""Lines of a project: list/create nested, flat `/project-items/{id}`, placements, status, journal, files, summary."""

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.project_item import (
    EventRead,
    ItemFileAttach,
    ItemFileUpdate,
    ItemKind,
    ItemStatus,
    PlacementCreate,
    PlacementUpdate,
    ProjectItemCreate,
    ProjectItemRead,
    ProjectItemUpdate,
    ProjectSummaryRead,
    ReplaceProduct,
    StatusChange,
)
from ffe.services import project_item as service

router = APIRouter(tags=["project-items"])

ProjectId = Annotated[int, Path(ge=1)]
ItemId = Annotated[int, Path(ge=1)]
PlacementId = Annotated[int, Path(ge=1)]
FileId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/project-items", operation_id="listProjectItems")
def list_items(
    project_id: ProjectId,
    session: SessionDep,
    zone_id: Annotated[int | None, Query(alias="zoneId", ge=1)] = None,
    status: ItemStatus | None = None,
    category_id: Annotated[int | None, Query(alias="categoryId", ge=1)] = None,
    supplier_id: Annotated[int | None, Query(alias="supplierId", ge=1)] = None,
    kind: ItemKind | None = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
) -> list[ProjectItemRead]:
    items = service.list_items(
        session,
        project_id,
        zone_id=zone_id,
        status=status,
        category_id=category_id,
        supplier_id=supplier_id,
        kind=kind,
        q=q,
    )
    return [ProjectItemRead.from_model(i) for i in items]


@router.post(
    "/projects/{project_id}/project-items", status_code=201, operation_id="createProjectItem"
)
def create_item(
    project_id: ProjectId, payload: ProjectItemCreate, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.create_item(session, project_id, payload, deps.clock))


@router.get("/projects/{project_id}/summary", operation_id="getProjectSummary")
def get_summary(project_id: ProjectId, session: SessionDep, deps: DepsDep) -> ProjectSummaryRead:
    today = deps.clock().date()
    return ProjectSummaryRead.model_validate(service.summary(session, project_id, today))


@router.get("/project-items/{item_id}", operation_id="getProjectItem")
def get_item(item_id: ItemId, session: SessionDep) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.get_item(session, item_id))


@router.patch("/project-items/{item_id}", operation_id="updateProjectItem")
def update_item(
    item_id: ItemId, payload: ProjectItemUpdate, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.update_item(session, item_id, payload, deps.clock))


@router.delete("/project-items/{item_id}", status_code=204, operation_id="deleteProjectItem")
def delete_item(item_id: ItemId, session: SessionDep) -> Response:
    service.delete_item(session, item_id)
    return Response(status_code=204)


@router.post("/project-items/{item_id}/status", operation_id="changeProjectItemStatus")
def change_status(
    item_id: ItemId, payload: StatusChange, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.change_status(session, item_id, payload, deps.clock))


@router.post(
    "/project-items/{item_id}/replace", status_code=201, operation_id="replaceProjectItemProduct"
)
def replace_product(
    item_id: ItemId, payload: ReplaceProduct, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(
        service.replace_product(session, item_id, payload, deps.clock)
    )


@router.post("/project-items/{item_id}/refresh", operation_id="refreshProjectItemFromCatalogue")
def refresh_from_catalogue(item_id: ItemId, session: SessionDep, deps: DepsDep) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.refresh_from_catalogue(session, item_id, deps.clock))


@router.get("/project-items/{item_id}/events", operation_id="listProjectItemEvents")
def list_events(item_id: ItemId, session: SessionDep) -> list[EventRead]:
    return [EventRead.model_validate(e) for e in service.list_events(session, item_id)]


@router.post("/project-items/{item_id}/placements", status_code=201, operation_id="addPlacement")
def add_placement(
    item_id: ItemId, payload: PlacementCreate, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.add_placement(session, item_id, payload, deps.clock))


@router.patch("/placements/{placement_id}", operation_id="updatePlacement")
def update_placement(
    placement_id: PlacementId, payload: PlacementUpdate, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(
        service.update_placement(session, placement_id, payload, deps.clock)
    )


@router.delete("/placements/{placement_id}", operation_id="deletePlacement")
def delete_placement(
    placement_id: PlacementId, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.delete_placement(session, placement_id, deps.clock))


@router.post(
    "/project-items/{item_id}/files", status_code=201, operation_id="attachProjectItemFile"
)
def attach_file(
    item_id: ItemId, payload: ItemFileAttach, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.attach_file(session, item_id, payload, deps.clock))


@router.patch("/project-items/{item_id}/files/{file_id}", operation_id="updateProjectItemFile")
def update_file(
    item_id: ItemId, file_id: FileId, payload: ItemFileUpdate, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(
        service.update_file(session, item_id, file_id, payload, deps.clock)
    )


@router.delete("/project-items/{item_id}/files/{file_id}", operation_id="detachProjectItemFile")
def detach_file(
    item_id: ItemId, file_id: FileId, session: SessionDep, deps: DepsDep
) -> ProjectItemRead:
    return ProjectItemRead.from_model(
        service.detach_file(session, item_id, file_id, deps.settings.files_dir, deps.clock)
    )
