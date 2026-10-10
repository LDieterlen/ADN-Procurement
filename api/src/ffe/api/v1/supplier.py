"""`/suppliers` router (paginated catalogue list, API.md « Listes »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.base import Page
from ffe.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from ffe.services import supplier as service

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

SupplierId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listSuppliers")
def list_suppliers(
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[SupplierRead]:
    items, total = service.list_suppliers(session, q, include_archived, limit, offset)
    return Page(items=[SupplierRead.model_validate(s) for s in items], total=total)


@router.post("", status_code=201, operation_id="createSupplier")
def create_supplier(
    payload: SupplierCreate, session: SessionDep, deps: DepsDep, force: bool = False
) -> SupplierRead:
    return SupplierRead.model_validate(service.create_supplier(session, payload, deps.clock, force))


@router.get("/{supplier_id}", operation_id="getSupplier")
def get_supplier(supplier_id: SupplierId, session: SessionDep) -> SupplierRead:
    return SupplierRead.model_validate(service.get_supplier(session, supplier_id))


@router.patch("/{supplier_id}", operation_id="updateSupplier")
def update_supplier(
    supplier_id: SupplierId, payload: SupplierUpdate, session: SessionDep, deps: DepsDep
) -> SupplierRead:
    return SupplierRead.model_validate(
        service.update_supplier(session, supplier_id, payload, deps.clock)
    )


@router.post("/{supplier_id}/archive", operation_id="archiveSupplier")
def archive_supplier(supplier_id: SupplierId, session: SessionDep, deps: DepsDep) -> SupplierRead:
    return SupplierRead.model_validate(service.archive_supplier(session, supplier_id, deps.clock))


@router.post("/{supplier_id}/unarchive", operation_id="unarchiveSupplier")
def unarchive_supplier(supplier_id: SupplierId, session: SessionDep, deps: DepsDep) -> SupplierRead:
    return SupplierRead.model_validate(service.unarchive_supplier(session, supplier_id, deps.clock))
