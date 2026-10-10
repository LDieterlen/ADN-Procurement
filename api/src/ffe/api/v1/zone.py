"""Zones: nested once under a project for list/create/reorder, flat `/zones/{id}` afterwards."""

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.zone import ZoneCreate, ZoneRead, ZoneReorder, ZoneUpdate
from ffe.services import zone as service

router = APIRouter(tags=["zones"])

ProjectId = Annotated[int, Path(ge=1)]
ZoneId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/zones", operation_id="listZones")
def list_zones(
    project_id: ProjectId,
    session: SessionDep,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
) -> list[ZoneRead]:
    return [
        ZoneRead.model_validate(z)
        for z in service.list_zones(session, project_id, include_archived)
    ]


@router.post("/projects/{project_id}/zones", status_code=201, operation_id="createZone")
def create_zone(
    project_id: ProjectId, payload: ZoneCreate, session: SessionDep, deps: DepsDep
) -> ZoneRead:
    return ZoneRead.model_validate(service.create_zone(session, project_id, payload, deps.clock))


@router.post("/projects/{project_id}/zones/reorder", operation_id="reorderZones")
def reorder_zones(
    project_id: ProjectId, payload: ZoneReorder, session: SessionDep, deps: DepsDep
) -> list[ZoneRead]:
    return [
        ZoneRead.model_validate(z)
        for z in service.reorder_zones(session, project_id, payload, deps.clock)
    ]


@router.get("/zones/{zone_id}", operation_id="getZone")
def get_zone(zone_id: ZoneId, session: SessionDep) -> ZoneRead:
    return ZoneRead.model_validate(service.get_zone(session, zone_id))


@router.patch("/zones/{zone_id}", operation_id="updateZone")
def update_zone(
    zone_id: ZoneId, payload: ZoneUpdate, session: SessionDep, deps: DepsDep
) -> ZoneRead:
    return ZoneRead.model_validate(service.update_zone(session, zone_id, payload, deps.clock))


@router.delete("/zones/{zone_id}", status_code=204, operation_id="deleteZone")
def delete_zone(zone_id: ZoneId, session: SessionDep) -> Response:
    service.delete_zone(session, zone_id)
    return Response(status_code=204)


@router.post("/zones/{zone_id}/archive", operation_id="archiveZone")
def archive_zone(zone_id: ZoneId, session: SessionDep, deps: DepsDep) -> ZoneRead:
    return ZoneRead.model_validate(service.archive_zone(session, zone_id, deps.clock))


@router.post("/zones/{zone_id}/unarchive", operation_id="unarchiveZone")
def unarchive_zone(zone_id: ZoneId, session: SessionDep, deps: DepsDep) -> ZoneRead:
    return ZoneRead.model_validate(service.unarchive_zone(session, zone_id, deps.clock))
