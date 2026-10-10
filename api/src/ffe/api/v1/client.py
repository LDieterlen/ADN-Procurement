"""`/clients` router: zero logic, one service call per route (ARCHITECTURE §3)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.client import ClientCreate, ClientRead, ClientUpdate
from ffe.services import client as service

router = APIRouter(prefix="/clients", tags=["clients"])

ClientId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listClients")
def list_clients(
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
) -> list[ClientRead]:
    return [
        ClientRead.model_validate(c) for c in service.list_clients(session, q, include_archived)
    ]


@router.post("", status_code=201, operation_id="createClient")
def create_client(
    payload: ClientCreate, session: SessionDep, deps: DepsDep, force: bool = False
) -> ClientRead:
    return ClientRead.model_validate(service.create_client(session, payload, deps.clock, force))


@router.get("/{client_id}", operation_id="getClient")
def get_client(client_id: ClientId, session: SessionDep) -> ClientRead:
    return ClientRead.model_validate(service.get_client(session, client_id))


@router.patch("/{client_id}", operation_id="updateClient")
def update_client(
    client_id: ClientId, payload: ClientUpdate, session: SessionDep, deps: DepsDep
) -> ClientRead:
    return ClientRead.model_validate(service.update_client(session, client_id, payload, deps.clock))


@router.post("/{client_id}/archive", operation_id="archiveClient")
def archive_client(client_id: ClientId, session: SessionDep, deps: DepsDep) -> ClientRead:
    return ClientRead.model_validate(service.archive_client(session, client_id, deps.clock))


@router.post("/{client_id}/unarchive", operation_id="unarchiveClient")
def unarchive_client(client_id: ClientId, session: SessionDep, deps: DepsDep) -> ClientRead:
    return ClientRead.model_validate(service.unarchive_client(session, client_id, deps.clock))
