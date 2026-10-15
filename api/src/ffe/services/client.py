"""`client` service: list, get, create, update, archive, unarchive (template of every resource)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError
from ffe.i18n import fr
from ffe.models import Client
from ffe.schemas.client import ClientCreate, ClientUpdate
from ffe.services.base import normalize_key, stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import check_duplicate_name, ensure_active, get_or_404
from ffe.services.common import unarchive as common_unarchive
from ffe.services.project import open_project_count

RESOURCE = "client"


def list_clients(
    session: Session, q: str | None = None, include_archived: bool = False
) -> list[Client]:
    query = select(Client).order_by(Client.name, Client.id)
    if not include_archived:
        query = query.where(Client.archived_at.is_(None))
    clients = list(session.scalars(query))
    if q and q.strip():
        needle = normalize_key(q)
        clients = [c for c in clients if needle in normalize_key(c.name)]
    return clients


def get_client(session: Session, client_id: int) -> Client:
    return get_or_404(session, Client, client_id, RESOURCE)


def _check_duplicate(session: Session, name: str, exclude_id: int | None, force: bool) -> None:
    check_duplicate_name(session, Client, RESOURCE, name, exclude_id, force)


def create_client(
    session: Session, data: ClientCreate, clock: Clock, force: bool = False
) -> Client:
    with session.begin():
        _check_duplicate(session, data.name, exclude_id=None, force=force)
        now = stamp(clock)
        client = Client(**data.model_dump(), created_at=now, updated_at=now)
        session.add(client)
    return client


def update_client(session: Session, client_id: int, data: ClientUpdate, clock: Clock) -> Client:
    with session.begin():
        client = ensure_active(get_client(session, client_id), RESOURCE)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] != client.name:
            _check_duplicate(session, changes["name"], exclude_id=client_id, force=False)
        for field_name, value in changes.items():
            setattr(client, field_name, value)
        client.updated_at = stamp(clock)
    return client


def archive_client(session: Session, client_id: int, clock: Clock) -> Client:
    """Refused while the client has an open project; otherwise the common archive."""
    with session.begin():
        client = get_client(session, client_id)
        open_projects = open_project_count(session, client_id) if client.archived_at is None else 0
        if open_projects:
            raise ConflictError(
                fr.CLIENT_HAS_OPEN_PROJECTS.format(id=client_id, count=open_projects)
            )
    return common_archive(session, Client, client_id, RESOURCE, clock)


def unarchive_client(session: Session, client_id: int, clock: Clock) -> Client:
    return common_unarchive(session, Client, client_id, RESOURCE, clock)
