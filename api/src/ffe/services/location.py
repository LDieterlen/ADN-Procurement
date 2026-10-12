"""`location` service: nested in a project; code unique per project; delete only when empty; reorder."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import Location
from ffe.schemas.location import LocationCreate, LocationReorder, LocationUpdate
from ffe.services.base import stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import unarchive as common_unarchive
from ffe.services.project import ensure_open, get_project

RESOURCE = "location"


def list_locations(
    session: Session, project_id: int, include_archived: bool = False
) -> list[Location]:
    get_project(session, project_id)
    query = (
        select(Location)
        .where(Location.project_id == project_id)
        .order_by(Location.sort_order, Location.id)
    )
    if not include_archived:
        query = query.where(Location.archived_at.is_(None))
    return list(session.scalars(query))


def get_location(session: Session, location_id: int) -> Location:
    location = session.get(Location, location_id)
    if location is None:
        raise NotFoundError(RESOURCE, location_id)
    return location


def _check_code_free(session: Session, project_id: int, code: str, exclude_id: int | None) -> None:
    taken = session.scalar(
        select(Location.id).where(
            Location.project_id == project_id, func.lower(Location.code) == code.lower()
        )
    )
    if taken is not None and taken != exclude_id:
        raise ValidationAppError([ErrorDetail("code", fr.LOCATION_CODE_TAKEN)])


def create_location(
    session: Session, project_id: int, data: LocationCreate, clock: Clock
) -> Location:
    with session.begin():
        ensure_open(get_project(session, project_id))
        _check_code_free(session, project_id, data.code, None)
        values = data.model_dump()
        if values["sort_order"] is None:
            last = session.scalar(
                select(func.max(Location.sort_order)).where(Location.project_id == project_id)
            )
            values["sort_order"] = (last or 0) + 10
        now = stamp(clock)
        location = Location(**values, project_id=project_id, created_at=now, updated_at=now)
        session.add(location)
    return location


def update_location(
    session: Session, location_id: int, data: LocationUpdate, clock: Clock
) -> Location:
    with session.begin():
        location = get_location(session, location_id)
        ensure_open(get_project(session, location.project_id))
        if location.archived_at is not None:
            raise ConflictError(
                fr.ARCHIVED_READ_ONLY.format(resource=fr.resource_label(RESOURCE), id=location_id)
            )
        changes = data.model_dump(exclude_unset=True)
        if "code" in changes and changes["code"].lower() != location.code.lower():
            _check_code_free(session, location.project_id, changes["code"], location_id)
        for field_name, value in changes.items():
            setattr(location, field_name, value)
        location.updated_at = stamp(clock)
    return location


def archive_location(session: Session, location_id: int, clock: Clock) -> Location:
    with session.begin():
        ensure_open(get_project(session, get_location(session, location_id).project_id))
    return common_archive(session, Location, location_id, RESOURCE, clock)


def unarchive_location(session: Session, location_id: int, clock: Clock) -> Location:
    with session.begin():
        ensure_open(get_project(session, get_location(session, location_id).project_id))
    return common_unarchive(session, Location, location_id, RESOURCE, clock)


def delete_location(session: Session, location_id: int) -> None:
    """Physical deletion of an empty location (DATA_MODEL §3); placements and budgets RESTRICT."""
    with session.begin():
        location = get_location(session, location_id)
        ensure_open(get_project(session, location.project_id))
        session.delete(location)


def reorder_locations(
    session: Session, project_id: int, data: LocationReorder, clock: Clock
) -> list[Location]:
    with session.begin():
        ensure_open(get_project(session, project_id))
        active = {z.id: z for z in list_locations(session, project_id)}
        if sorted(data.location_ids) != sorted(active):
            raise ValidationAppError([ErrorDetail("locationIds", fr.LOCATION_REORDER_MISMATCH)])
        now = stamp(clock)
        for position, location_id in enumerate(data.location_ids):
            active[location_id].sort_order = (position + 1) * 10
            active[location_id].updated_at = now
    with session.begin():
        return list_locations(session, project_id)
