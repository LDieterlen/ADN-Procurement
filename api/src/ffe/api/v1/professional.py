"""`/professionals` router (paginated catalogue list, API.md « Listes »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.base import Page
from ffe.schemas.professional import ProfessionalCreate, ProfessionalRead, ProfessionalUpdate
from ffe.services import professional as service

router = APIRouter(prefix="/professionals", tags=["professionals"])

ProfessionalId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listProfessionals")
def list_professionals(
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProfessionalRead]:
    items, total = service.list_professionals(session, q, include_archived, limit, offset)
    return Page(items=[ProfessionalRead.model_validate(m) for m in items], total=total)


@router.post("", status_code=201, operation_id="createProfessional")
def create_professional(
    payload: ProfessionalCreate, session: SessionDep, deps: DepsDep, force: bool = False
) -> ProfessionalRead:
    return ProfessionalRead.model_validate(
        service.create_professional(session, payload, deps.clock, force)
    )


@router.get("/{professional_id}", operation_id="getProfessional")
def get_professional(professional_id: ProfessionalId, session: SessionDep) -> ProfessionalRead:
    return ProfessionalRead.model_validate(service.get_professional(session, professional_id))


@router.patch("/{professional_id}", operation_id="updateProfessional")
def update_professional(
    professional_id: ProfessionalId, payload: ProfessionalUpdate, session: SessionDep, deps: DepsDep
) -> ProfessionalRead:
    return ProfessionalRead.model_validate(
        service.update_professional(session, professional_id, payload, deps.clock)
    )


@router.post("/{professional_id}/archive", operation_id="archiveProfessional")
def archive_professional(
    professional_id: ProfessionalId, session: SessionDep, deps: DepsDep
) -> ProfessionalRead:
    return ProfessionalRead.model_validate(
        service.archive_professional(session, professional_id, deps.clock)
    )


@router.post("/{professional_id}/unarchive", operation_id="unarchiveProfessional")
def unarchive_professional(
    professional_id: ProfessionalId, session: SessionDep, deps: DepsDep
) -> ProfessionalRead:
    return ProfessionalRead.model_validate(
        service.unarchive_professional(session, professional_id, deps.clock)
    )
