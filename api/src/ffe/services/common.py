"""What D6a.3 factorises: get-or-404, archive, unarchive, duplicate check, in-memory search/paging.

`create` and `update` stay explicit in each resource service.
"""

from collections.abc import Iterable, Sequence
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Mapped, Session

from ffe.deps import Clock
from ffe.errors import ArchivedDuplicateError, ConflictError, DuplicateError, NotFoundError
from ffe.i18n import fr
from ffe.services.base import normalize_key, stamp


class Archivable(Protocol):
    """Shape of every archivable model (typed as SQLAlchemy declares the columns)."""

    id: Mapped[int]
    name: Mapped[str]
    archived_at: Mapped[str | None]
    updated_at: Mapped[str]


def get_or_404[T: Archivable](session: Session, model: type[T], id: int, resource: str) -> T:
    entity = session.get(model, id)
    if entity is None:
        raise NotFoundError(resource, id)
    return entity


def ensure_active[T: Archivable](entity: T, resource: str) -> T:
    if entity.archived_at is not None:
        raise ConflictError(
            fr.ARCHIVED_READ_ONLY.format(resource=fr.resource_label(resource), id=entity.id)
        )
    return entity


def archive[T: Archivable](
    session: Session, model: type[T], id: int, resource: str, clock: Clock
) -> T:
    with session.begin():
        entity = get_or_404(session, model, id, resource)
        if entity.archived_at is not None:
            raise ConflictError(
                fr.ALREADY_ARCHIVED.format(resource=fr.resource_label(resource), id=id)
            )
        entity.archived_at = entity.updated_at = stamp(clock)
    return entity


def unarchive[T: Archivable](
    session: Session, model: type[T], id: int, resource: str, clock: Clock
) -> T:
    with session.begin():
        entity = get_or_404(session, model, id, resource)
        if entity.archived_at is None:
            raise ConflictError(fr.NOT_ARCHIVED.format(resource=fr.resource_label(resource), id=id))
        entity.archived_at = None
        entity.updated_at = stamp(clock)
    return entity


def check_duplicate_name[T: Archivable](
    session: Session,
    model: type[T],
    resource: str,
    name: str,
    exclude_id: int | None,
    force: bool,
) -> None:
    """Active twin → 409 duplicate (unless forced); archived twin → 409 conflict with archivedId."""
    key = normalize_key(name)
    rows = session.execute(select(model.id, model.name, model.archived_at)).all()  # type: ignore[arg-type]
    for other_id, other_name, archived_at in rows:
        if other_id == exclude_id or normalize_key(str(other_name)) != key:
            continue
        if archived_at is not None:
            raise ArchivedDuplicateError(resource, int(other_id))
        if not force:
            raise DuplicateError(resource, int(other_id))


def search[T](rows: Sequence[T], q: str | None, keys: Sequence[str]) -> list[T]:
    """Accent- and case-insensitive substring match on the given attributes (D6a.6)."""
    if not q or not q.strip():
        return list(rows)
    needle = normalize_key(q)
    return [
        row
        for row in rows
        if any(needle in normalize_key(str(value)) for key in keys if (value := getattr(row, key)))
    ]


def page[T](rows: Sequence[T], limit: int, offset: int) -> tuple[list[T], int]:
    return list(rows[offset : offset + limit]), len(rows)


def distinct_sorted(values: Iterable[str | None]) -> list[str]:
    """Distinct non-empty texts (first spelling kept, accents and case ignored), sorted."""
    seen: dict[str, str] = {}
    for value in values:
        if value and (key := normalize_key(value)) not in seen:
            seen[key] = value
    return sorted(seen.values(), key=normalize_key)
