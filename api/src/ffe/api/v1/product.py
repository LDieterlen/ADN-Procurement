"""`/products` router: paginated catalogue with filters, file junctions (API.md « Produits », « Fichiers »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.base import Page
from ffe.schemas.product import (
    ProductCreate,
    ProductFileAttach,
    ProductFileUpdate,
    ProductRead,
    ProductUpdate,
)
from ffe.services import product as service

router = APIRouter(prefix="/products", tags=["products"])

ProductId = Annotated[int, Path(ge=1)]
FileId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listProducts")
def list_products(
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
    category_id: Annotated[int | None, Query(alias="categoryId", ge=1)] = None,
    supplier_id: Annotated[int | None, Query(alias="supplierId", ge=1)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProductRead]:
    items, total = service.list_products(
        session, q, include_archived, category_id, supplier_id, limit, offset
    )
    return Page(items=[ProductRead.from_model(p) for p in items], total=total)


@router.post("", status_code=201, operation_id="createProduct")
def create_product(
    payload: ProductCreate, session: SessionDep, deps: DepsDep, force: bool = False
) -> ProductRead:
    return ProductRead.from_model(service.create_product(session, payload, deps.clock, force))


@router.get("/{product_id}", operation_id="getProduct")
def get_product(product_id: ProductId, session: SessionDep) -> ProductRead:
    return ProductRead.from_model(service.get_product(session, product_id))


@router.patch("/{product_id}", operation_id="updateProduct")
def update_product(
    product_id: ProductId, payload: ProductUpdate, session: SessionDep, deps: DepsDep
) -> ProductRead:
    return ProductRead.from_model(service.update_product(session, product_id, payload, deps.clock))


@router.post("/{product_id}/archive", operation_id="archiveProduct")
def archive_product(product_id: ProductId, session: SessionDep, deps: DepsDep) -> ProductRead:
    return ProductRead.from_model(service.archive_product(session, product_id, deps.clock))


@router.post("/{product_id}/unarchive", operation_id="unarchiveProduct")
def unarchive_product(product_id: ProductId, session: SessionDep, deps: DepsDep) -> ProductRead:
    return ProductRead.from_model(service.unarchive_product(session, product_id, deps.clock))


@router.post("/{product_id}/files", status_code=201, operation_id="attachProductFile")
def attach_product_file(
    product_id: ProductId, payload: ProductFileAttach, session: SessionDep, deps: DepsDep
) -> ProductRead:
    return ProductRead.from_model(service.attach_file(session, product_id, payload, deps.clock))


@router.patch("/{product_id}/files/{file_id}", operation_id="updateProductFile")
def update_product_file(
    product_id: ProductId,
    file_id: FileId,
    payload: ProductFileUpdate,
    session: SessionDep,
    deps: DepsDep,
) -> ProductRead:
    return ProductRead.from_model(
        service.update_file(session, product_id, file_id, payload, deps.clock)
    )


@router.delete("/{product_id}/files/{file_id}", operation_id="detachProductFile")
def detach_product_file(
    product_id: ProductId, file_id: FileId, session: SessionDep, deps: DepsDep
) -> ProductRead:
    return ProductRead.from_model(
        service.detach_file(session, product_id, file_id, deps.settings.files_dir, deps.clock)
    )
