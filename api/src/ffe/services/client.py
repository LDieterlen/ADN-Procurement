"""`client` service: list, get, create, update, archive, unarchive (template of every resource)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ArchivedDuplicateError, ConflictError, DuplicateError, NotFoundError
from ffe.i18n import fr
from ffe.models import Client
from ffe.schemas.client import ClientCreate, ClientUpdate
from ffe.services.base import normalize_key, stamp

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
    client = session.get(Client, client_id)
    if client is None:
        raise NotFoundError(RESOURCE, client_id)
    return client


def _check_duplicate(session: Session, name: str, exclude_id: int | None, force: bool) -> None:
    key = normalize_key(name)
    rows = session.execute(select(Client.id, Client.name, Client.archived_at)).all()
    for other_id, other_name, archived_at in rows:
        if other_id == exclude_id or normalize_key(other_name) != key:
            continue
        if archived_at is not None:
            raise ArchivedDuplicateError(RESOURCE, other_id)
        if not force:
            raise DuplicateError(RESOURCE, other_id)


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
        client = get_client(session, client_id)
        if client.archived_at is not None:
            raise ConflictError(
                fr.ARCHIVED_READ_ONLY.format(resource=fr.resource_label(RESOURCE), id=client_id)
            )
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] != client.name:
            _check_duplicate(session, changes["name"], exclude_id=client_id, force=False)
        for field_name, value in changes.items():
            setattr(client, field_name, value)
        client.updated_at = stamp(clock)
    return client


def archive_client(session: Session, client_id: int, clock: Clock) -> Client:
    with session.begin():
        client = get_client(session, client_id)
        if client.archived_at is not None:
            raise ConflictError(
                fr.ALREADY_ARCHIVED.format(resource=fr.resource_label(RESOURCE), id=client_id)
            )
        client.archived_at = client.updated_at = stamp(clock)
    return client


def unarchive_client(session: Session, client_id: int, clock: Clock) -> Client:
    with session.begin():
        client = get_client(session, client_id)
        if client.archived_at is None:
            raise ConflictError(
                fr.NOT_ARCHIVED.format(resource=fr.resource_label(RESOURCE), id=client_id)
            )
        client.archived_at = None
        client.updated_at = stamp(clock)
    return client
