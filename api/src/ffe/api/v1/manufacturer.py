"""`/manufacturers` router (paginated catalogue list, API.md « Listes »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.base import Page
from ffe.schemas.manufacturer import ManufacturerCreate, ManufacturerRead, ManufacturerUpdate
from ffe.services import manufacturer as service

router = APIRouter(prefix="/manufacturers", tags=["manufacturers"])

ManufacturerId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listManufacturers")
def list_manufacturers(
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ManufacturerRead]:
    items, total = service.list_manufacturers(session, q, include_archived, limit, offset)
    return Page(items=[ManufacturerRead.model_validate(m) for m in items], total=total)


@router.post("", status_code=201, operation_id="createManufacturer")
def create_manufacturer(
    payload: ManufacturerCreate, session: SessionDep, deps: DepsDep, force: bool = False
) -> ManufacturerRead:
    return ManufacturerRead.model_validate(
        service.create_manufacturer(session, payload, deps.clock, force)
    )


@router.get("/{manufacturer_id}", operation_id="getManufacturer")
def get_manufacturer(manufacturer_id: ManufacturerId, session: SessionDep) -> ManufacturerRead:
    return ManufacturerRead.model_validate(service.get_manufacturer(session, manufacturer_id))


@router.patch("/{manufacturer_id}", operation_id="updateManufacturer")
def update_manufacturer(
    manufacturer_id: ManufacturerId, payload: ManufacturerUpdate, session: SessionDep, deps: DepsDep
) -> ManufacturerRead:
    return ManufacturerRead.model_validate(
        service.update_manufacturer(session, manufacturer_id, payload, deps.clock)
    )


@router.post("/{manufacturer_id}/archive", operation_id="archiveManufacturer")
def archive_manufacturer(
    manufacturer_id: ManufacturerId, session: SessionDep, deps: DepsDep
) -> ManufacturerRead:
    return ManufacturerRead.model_validate(
        service.archive_manufacturer(session, manufacturer_id, deps.clock)
    )


@router.post("/{manufacturer_id}/unarchive", operation_id="unarchiveManufacturer")
def unarchive_manufacturer(
    manufacturer_id: ManufacturerId, session: SessionDep, deps: DepsDep
) -> ManufacturerRead:
    return ManufacturerRead.model_validate(
        service.unarchive_manufacturer(session, manufacturer_id, deps.clock)
    )
