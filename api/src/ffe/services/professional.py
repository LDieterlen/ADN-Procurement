"""`professional` service (template `client`, D6a.3 factorisation)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.models import Professional
from ffe.schemas.professional import ProfessionalCreate, ProfessionalUpdate
from ffe.services.base import normalize_key, stamp
from ffe.services.choice import check_code
from ffe.services.common import archive as common_archive
from ffe.services.common import (
    check_duplicate_name,
    distinct_sorted,
    ensure_active,
    get_or_404,
    page,
    search,
)
from ffe.services.common import unarchive as common_unarchive

RESOURCE = "professional"


def list_professionals(
    session: Session,
    q: str | None,
    include_archived: bool,
    limit: int,
    offset: int,
    specialty: str | None = None,
    kind: str | None = None,
) -> tuple[list[Professional], int]:
    query = select(Professional).order_by(Professional.name, Professional.id)
    if not include_archived:
        query = query.where(Professional.archived_at.is_(None))
    if kind:
        query = query.where(Professional.kind == kind)
    rows = search(list(session.scalars(query)), q, ("name", "specialty", "contact_name"))
    if specialty:
        rows = [r for r in rows if normalize_key(r.specialty or "") == normalize_key(specialty)]
    return page(rows, limit, offset)


def list_specialties(session: Session) -> list[str]:
    """Distinct specialties of the active professionals, for the filter menu."""
    query = select(Professional.specialty).where(Professional.archived_at.is_(None))
    return distinct_sorted(session.scalars(query))


def get_professional(session: Session, professional_id: int) -> Professional:
    return get_or_404(session, Professional, professional_id, RESOURCE)


def create_professional(
    session: Session, data: ProfessionalCreate, clock: Clock, force: bool = False
) -> Professional:
    with session.begin():
        check_code(session, "prestation", data.kind, "kind")
        check_duplicate_name(session, Professional, RESOURCE, data.name, None, force)
        now = stamp(clock)
        professional = Professional(**data.model_dump(), created_at=now, updated_at=now)
        session.add(professional)
    return professional


def update_professional(
    session: Session, professional_id: int, data: ProfessionalUpdate, clock: Clock
) -> Professional:
    with session.begin():
        professional = ensure_active(get_professional(session, professional_id), RESOURCE)
        changes = data.model_dump(exclude_unset=True)
        if "kind" in changes and changes["kind"] != professional.kind:
            check_code(session, "prestation", changes["kind"], "kind")
        if "name" in changes and changes["name"] != professional.name:
            check_duplicate_name(
                session, Professional, RESOURCE, changes["name"], professional_id, False
            )
        for field_name, value in changes.items():
            setattr(professional, field_name, value)
        professional.updated_at = stamp(clock)
    return professional


def archive_professional(session: Session, professional_id: int, clock: Clock) -> Professional:
    return common_archive(session, Professional, professional_id, RESOURCE, clock)


def unarchive_professional(session: Session, professional_id: int, clock: Clock) -> Professional:
    return common_unarchive(session, Professional, professional_id, RESOURCE, clock)
