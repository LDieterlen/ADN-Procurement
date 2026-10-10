"""`zone` service: nested in a project; code unique per project; delete only when empty; reorder."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import Zone
from ffe.schemas.zone import ZoneCreate, ZoneReorder, ZoneUpdate
from ffe.services.base import stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import unarchive as common_unarchive
from ffe.services.project import ensure_open, get_project

RESOURCE = "zone"


def list_zones(session: Session, project_id: int, include_archived: bool = False) -> list[Zone]:
    get_project(session, project_id)
    query = select(Zone).where(Zone.project_id == project_id).order_by(Zone.sort_order, Zone.id)
    if not include_archived:
        query = query.where(Zone.archived_at.is_(None))
    return list(session.scalars(query))


def get_zone(session: Session, zone_id: int) -> Zone:
    zone = session.get(Zone, zone_id)
    if zone is None:
        raise NotFoundError(RESOURCE, zone_id)
    return zone


def _check_code_free(session: Session, project_id: int, code: str, exclude_id: int | None) -> None:
    taken = session.scalar(
        select(Zone.id).where(Zone.project_id == project_id, func.lower(Zone.code) == code.lower())
    )
    if taken is not None and taken != exclude_id:
        raise ValidationAppError([ErrorDetail("code", fr.ZONE_CODE_TAKEN)])


def create_zone(session: Session, project_id: int, data: ZoneCreate, clock: Clock) -> Zone:
    with session.begin():
        ensure_open(get_project(session, project_id))
        _check_code_free(session, project_id, data.code, None)
        values = data.model_dump()
        if values["sort_order"] is None:
            last = session.scalar(
                select(func.max(Zone.sort_order)).where(Zone.project_id == project_id)
            )
            values["sort_order"] = (last or 0) + 10
        now = stamp(clock)
        zone = Zone(**values, project_id=project_id, created_at=now, updated_at=now)
        session.add(zone)
    return zone


def update_zone(session: Session, zone_id: int, data: ZoneUpdate, clock: Clock) -> Zone:
    with session.begin():
        zone = get_zone(session, zone_id)
        ensure_open(get_project(session, zone.project_id))
        if zone.archived_at is not None:
            raise ConflictError(
                fr.ARCHIVED_READ_ONLY.format(resource=fr.resource_label(RESOURCE), id=zone_id)
            )
        changes = data.model_dump(exclude_unset=True)
        if "code" in changes and changes["code"].lower() != zone.code.lower():
            _check_code_free(session, zone.project_id, changes["code"], zone_id)
        for field_name, value in changes.items():
            setattr(zone, field_name, value)
        zone.updated_at = stamp(clock)
    return zone


def archive_zone(session: Session, zone_id: int, clock: Clock) -> Zone:
    with session.begin():
        ensure_open(get_project(session, get_zone(session, zone_id).project_id))
    return common_archive(session, Zone, zone_id, RESOURCE, clock)


def unarchive_zone(session: Session, zone_id: int, clock: Clock) -> Zone:
    with session.begin():
        ensure_open(get_project(session, get_zone(session, zone_id).project_id))
    return common_unarchive(session, Zone, zone_id, RESOURCE, clock)


def delete_zone(session: Session, zone_id: int) -> None:
    """Physical deletion of an empty zone (DATA_MODEL §3); placements (7a) and budgets (8) RESTRICT."""
    with session.begin():
        zone = get_zone(session, zone_id)
        ensure_open(get_project(session, zone.project_id))
        session.delete(zone)


def reorder_zones(session: Session, project_id: int, data: ZoneReorder, clock: Clock) -> list[Zone]:
    with session.begin():
        ensure_open(get_project(session, project_id))
        active = {z.id: z for z in list_zones(session, project_id)}
        if sorted(data.zone_ids) != sorted(active):
            raise ValidationAppError([ErrorDetail("zoneIds", fr.ZONE_REORDER_MISMATCH)])
        now = stamp(clock)
        for position, zone_id in enumerate(data.zone_ids):
            active[zone_id].sort_order = (position + 1) * 10
            active[zone_id].updated_at = now
    return list_zones(session, project_id)
