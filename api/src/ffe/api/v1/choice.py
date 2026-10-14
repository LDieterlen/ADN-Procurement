"""`/choices` router: editable value lists (family, usage, prestation)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.choice import ChoiceCreate, ChoiceList, ChoiceRead, ChoiceUpdate
from ffe.services import choice as service

router = APIRouter(prefix="/choices", tags=["choices"])

ChoiceId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listChoices")
def list_choices(
    session: SessionDep,
    list_name: Annotated[ChoiceList | None, Query(alias="list")] = None,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
) -> list[ChoiceRead]:
    return [
        ChoiceRead.model_validate(c)
        for c in service.list_choices(session, list_name, include_archived)
    ]


@router.post("", status_code=201, operation_id="createChoice")
def create_choice(payload: ChoiceCreate, session: SessionDep, deps: DepsDep) -> ChoiceRead:
    return ChoiceRead.model_validate(service.create_choice(session, payload, deps.clock))


@router.patch("/{choice_id}", operation_id="updateChoice")
def update_choice(
    choice_id: ChoiceId, payload: ChoiceUpdate, session: SessionDep, deps: DepsDep
) -> ChoiceRead:
    return ChoiceRead.model_validate(service.update_choice(session, choice_id, payload, deps.clock))


@router.post("/{choice_id}/archive", operation_id="archiveChoice")
def archive_choice(choice_id: ChoiceId, session: SessionDep, deps: DepsDep) -> ChoiceRead:
    return ChoiceRead.model_validate(service.archive_choice(session, choice_id, deps.clock))


@router.post("/{choice_id}/unarchive", operation_id="unarchiveChoice")
def unarchive_choice(choice_id: ChoiceId, session: SessionDep, deps: DepsDep) -> ChoiceRead:
    return ChoiceRead.model_validate(service.unarchive_choice(session, choice_id, deps.clock))
