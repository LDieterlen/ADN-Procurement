"""`supplier` service (template `client`, D6a.3 factorisation)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ErrorDetail, ValidationAppError
from ffe.models import Supplier
from ffe.schemas.supplier import SIRET_MISMATCH, SupplierCreate, SupplierUpdate
from ffe.services.base import stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import check_duplicate_name, ensure_active, get_or_404, page, search
from ffe.services.common import unarchive as common_unarchive

RESOURCE = "supplier"


def list_suppliers(
    session: Session, q: str | None, include_archived: bool, limit: int, offset: int
) -> tuple[list[Supplier], int]:
    query = select(Supplier).order_by(Supplier.name, Supplier.id)
    if not include_archived:
        query = query.where(Supplier.archived_at.is_(None))
    rows = search(list(session.scalars(query)), q, ("name", "legal_name"))
    return page(rows, limit, offset)


def get_supplier(session: Session, supplier_id: int) -> Supplier:
    return get_or_404(session, Supplier, supplier_id, RESOURCE)


def create_supplier(
    session: Session, data: SupplierCreate, clock: Clock, force: bool = False
) -> Supplier:
    with session.begin():
        check_duplicate_name(session, Supplier, RESOURCE, data.name, None, force)
        now = stamp(clock)
        supplier = Supplier(**data.model_dump(), created_at=now, updated_at=now)
        session.add(supplier)
    return supplier


def update_supplier(
    session: Session, supplier_id: int, data: SupplierUpdate, clock: Clock
) -> Supplier:
    with session.begin():
        supplier = ensure_active(get_supplier(session, supplier_id), RESOURCE)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] != supplier.name:
            check_duplicate_name(session, Supplier, RESOURCE, changes["name"], supplier_id, False)
        siren = changes.get("siren", supplier.siren)
        siret = changes.get("siret", supplier.siret)
        if siren and siret and not siret.startswith(siren):
            raise ValidationAppError([ErrorDetail("siret", SIRET_MISMATCH)])
        for field_name, value in changes.items():
            setattr(supplier, field_name, value)
        supplier.updated_at = stamp(clock)
    return supplier


def archive_supplier(session: Session, supplier_id: int, clock: Clock) -> Supplier:
    return common_archive(session, Supplier, supplier_id, RESOURCE, clock)


def unarchive_supplier(session: Session, supplier_id: int, clock: Clock) -> Supplier:
    return common_unarchive(session, Supplier, supplier_id, RESOURCE, clock)
