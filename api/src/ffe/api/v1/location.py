"""Locations: nested once under a project for list/create/reorder, flat `/locations/{id}` afterwards."""

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.location import LocationCreate, LocationRead, LocationReorder, LocationUpdate
from ffe.services import location as service

router = APIRouter(tags=["locations"])

ProjectId = Annotated[int, Path(ge=1)]
LocationId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/locations", operation_id="listLocations")
def list_locations(
    project_id: ProjectId,
    session: SessionDep,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
) -> list[LocationRead]:
    return [
        LocationRead.model_validate(z)
        for z in service.list_locations(session, project_id, include_archived)
    ]


@router.post("/projects/{project_id}/locations", status_code=201, operation_id="createLocation")
def create_location(
    project_id: ProjectId, payload: LocationCreate, session: SessionDep, deps: DepsDep
) -> LocationRead:
    return LocationRead.model_validate(
        service.create_location(session, project_id, payload, deps.clock)
    )


@router.post("/projects/{project_id}/locations/reorder", operation_id="reorderLocations")
def reorder_locations(
    project_id: ProjectId, payload: LocationReorder, session: SessionDep, deps: DepsDep
) -> list[LocationRead]:
    return [
        LocationRead.model_validate(z)
        for z in service.reorder_locations(session, project_id, payload, deps.clock)
    ]


@router.get("/locations/{location_id}", operation_id="getLocation")
def get_location(location_id: LocationId, session: SessionDep) -> LocationRead:
    return LocationRead.model_validate(service.get_location(session, location_id))


@router.patch("/locations/{location_id}", operation_id="updateLocation")
def update_location(
    location_id: LocationId, payload: LocationUpdate, session: SessionDep, deps: DepsDep
) -> LocationRead:
    return LocationRead.model_validate(
        service.update_location(session, location_id, payload, deps.clock)
    )


@router.delete("/locations/{location_id}", status_code=204, operation_id="deleteLocation")
def delete_location(location_id: LocationId, session: SessionDep) -> Response:
    service.delete_location(session, location_id)
    return Response(status_code=204)


@router.post("/locations/{location_id}/archive", operation_id="archiveLocation")
def archive_location(location_id: LocationId, session: SessionDep, deps: DepsDep) -> LocationRead:
    return LocationRead.model_validate(service.archive_location(session, location_id, deps.clock))


@router.post("/locations/{location_id}/unarchive", operation_id="unarchiveLocation")
def unarchive_location(location_id: LocationId, session: SessionDep, deps: DepsDep) -> LocationRead:
    return LocationRead.model_validate(service.unarchive_location(session, location_id, deps.clock))
