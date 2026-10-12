"""`/categories` router: the product types, create, update, archive, unarchive."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from ffe.services import category as service

router = APIRouter(prefix="/categories", tags=["categories"])

CategoryId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listCategories")
def list_categories(
    session: SessionDep,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
) -> list[CategoryRead]:
    return [
        CategoryRead.model_validate(c) for c in service.list_categories(session, include_archived)
    ]


@router.post("", status_code=201, operation_id="createCategory")
def create_category(payload: CategoryCreate, session: SessionDep, deps: DepsDep) -> CategoryRead:
    return CategoryRead.model_validate(service.create_category(session, payload, deps.clock))


@router.get("/{category_id}", operation_id="getCategory")
def get_category(category_id: CategoryId, session: SessionDep) -> CategoryRead:
    return CategoryRead.model_validate(service.get_category(session, category_id))


@router.patch("/{category_id}", operation_id="updateCategory")
def update_category(
    category_id: CategoryId, payload: CategoryUpdate, session: SessionDep, deps: DepsDep
) -> CategoryRead:
    return CategoryRead.model_validate(
        service.update_category(session, category_id, payload, deps.clock)
    )


@router.post("/{category_id}/archive", operation_id="archiveCategory")
def archive_category(category_id: CategoryId, session: SessionDep, deps: DepsDep) -> CategoryRead:
    return CategoryRead.model_validate(service.archive_category(session, category_id, deps.clock))


@router.post("/{category_id}/unarchive", operation_id="unarchiveCategory")
def unarchive_category(category_id: CategoryId, session: SessionDep, deps: DepsDep) -> CategoryRead:
    return CategoryRead.model_validate(service.unarchive_category(session, category_id, deps.clock))
