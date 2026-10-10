"""`manufacturer` service (template `client`, D6a.3 factorisation)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.models import Manufacturer
from ffe.schemas.manufacturer import ManufacturerCreate, ManufacturerUpdate
from ffe.services.base import stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import check_duplicate_name, ensure_active, get_or_404, page, search
from ffe.services.common import unarchive as common_unarchive

RESOURCE = "manufacturer"


def list_manufacturers(
    session: Session, q: str | None, include_archived: bool, limit: int, offset: int
) -> tuple[list[Manufacturer], int]:
    query = select(Manufacturer).order_by(Manufacturer.name, Manufacturer.id)
    if not include_archived:
        query = query.where(Manufacturer.archived_at.is_(None))
    rows = search(list(session.scalars(query)), q, ("name",))
    return page(rows, limit, offset)


def get_manufacturer(session: Session, manufacturer_id: int) -> Manufacturer:
    return get_or_404(session, Manufacturer, manufacturer_id, RESOURCE)


def create_manufacturer(
    session: Session, data: ManufacturerCreate, clock: Clock, force: bool = False
) -> Manufacturer:
    with session.begin():
        check_duplicate_name(session, Manufacturer, RESOURCE, data.name, None, force)
        now = stamp(clock)
        manufacturer = Manufacturer(**data.model_dump(), created_at=now, updated_at=now)
        session.add(manufacturer)
    return manufacturer


def update_manufacturer(
    session: Session, manufacturer_id: int, data: ManufacturerUpdate, clock: Clock
) -> Manufacturer:
    with session.begin():
        manufacturer = ensure_active(get_manufacturer(session, manufacturer_id), RESOURCE)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] != manufacturer.name:
            check_duplicate_name(
                session, Manufacturer, RESOURCE, changes["name"], manufacturer_id, False
            )
        for field_name, value in changes.items():
            setattr(manufacturer, field_name, value)
        manufacturer.updated_at = stamp(clock)
    return manufacturer


def archive_manufacturer(session: Session, manufacturer_id: int, clock: Clock) -> Manufacturer:
    return common_archive(session, Manufacturer, manufacturer_id, RESOURCE, clock)


def unarchive_manufacturer(session: Session, manufacturer_id: int, clock: Clock) -> Manufacturer:
    return common_unarchive(session, Manufacturer, manufacturer_id, RESOURCE, clock)
