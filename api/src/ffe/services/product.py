"""`product` service: catalogue sheet, filters, duplicate by manufacturer reference, file junctions."""

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import (
    ArchivedDuplicateError,
    ConflictError,
    DuplicateError,
    ErrorDetail,
    ValidationAppError,
)
from ffe.i18n import fr
from ffe.models import Category, Manufacturer, Product, ProductFile, Supplier
from ffe.schemas.product import ProductCreate, ProductFileAttach, ProductFileUpdate, ProductUpdate
from ffe.services.base import normalize_key, stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import ensure_active, get_or_404, page, search
from ffe.services.common import unarchive as common_unarchive
from ffe.services.file import get_file, unlink_if_orphan

RESOURCE = "product"


def list_products(
    session: Session,
    q: str | None,
    include_archived: bool,
    category_id: int | None,
    manufacturer_id: int | None,
    supplier_id: int | None,
    limit: int,
    offset: int,
) -> tuple[list[Product], int]:
    query = select(Product).order_by(Product.name, Product.id)
    if not include_archived:
        query = query.where(Product.archived_at.is_(None))
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if manufacturer_id is not None:
        query = query.where(Product.manufacturer_id == manufacturer_id)
    if supplier_id is not None:
        query = query.where(Product.supplier_id == supplier_id)
    rows = search(list(session.scalars(query)), q, ("name", "manufacturer_ref", "supplier_ref"))
    return page(rows, limit, offset)


def get_product(session: Session, product_id: int) -> Product:
    return get_or_404(session, Product, product_id, RESOURCE)


def _check_references(session: Session, data: dict[str, object]) -> None:
    """Referenced category / manufacturer / supplier must exist and be active (422 by field)."""
    checks = (
        ("category_id", Category, "categoryId", fr.CATEGORY_MUST_BE_ACTIVE),
        ("manufacturer_id", Manufacturer, "manufacturerId", fr.MANUFACTURER_MUST_BE_ACTIVE),
        ("supplier_id", Supplier, "supplierId", fr.SUPPLIER_MUST_BE_ACTIVE),
    )
    for column, model, field, archived_message in checks:
        value = data.get(column)
        if value is None:
            continue
        entity = session.get(model, value)
        if entity is None:
            raise ValidationAppError(
                [
                    ErrorDetail(
                        field,
                        fr.NOT_FOUND.format(
                            resource=fr.resource_label(model.__tablename__), id=value
                        ),
                    )
                ]
            )
        if entity.archived_at is not None:
            raise ValidationAppError([ErrorDetail(field, archived_message)])


def _check_duplicate_ref(
    session: Session,
    manufacturer_id: int | None,
    manufacturer_ref: str | None,
    exclude_id: int | None,
    force: bool,
) -> None:
    if manufacturer_id is None or not manufacturer_ref:
        return
    key = normalize_key(manufacturer_ref)
    rows = session.execute(
        select(Product.id, Product.manufacturer_ref, Product.archived_at).where(
            Product.manufacturer_id == manufacturer_id
        )
    ).all()
    for other_id, other_ref, archived_at in rows:
        if other_id == exclude_id or not other_ref or normalize_key(str(other_ref)) != key:
            continue
        if archived_at is not None:
            raise ArchivedDuplicateError(RESOURCE, int(other_id))
        if not force:
            raise DuplicateError(RESOURCE, int(other_id))


def create_product(
    session: Session, data: ProductCreate, clock: Clock, force: bool = False
) -> Product:
    with session.begin():
        values = data.model_dump()
        _check_references(session, values)
        _check_duplicate_ref(session, data.manufacturer_id, data.manufacturer_ref, None, force)
        now = stamp(clock)
        product = Product(**values, created_at=now, updated_at=now)
        session.add(product)
    return product


def update_product(session: Session, product_id: int, data: ProductUpdate, clock: Clock) -> Product:
    with session.begin():
        product = ensure_active(get_product(session, product_id), RESOURCE)
        changes = data.model_dump(exclude_unset=True)
        _check_references(session, changes)
        manufacturer_id = changes.get("manufacturer_id", product.manufacturer_id)
        manufacturer_ref = changes.get("manufacturer_ref", product.manufacturer_ref)
        if ("manufacturer_id" in changes or "manufacturer_ref" in changes) and (
            manufacturer_id != product.manufacturer_id
            or manufacturer_ref != product.manufacturer_ref
        ):
            _check_duplicate_ref(session, manufacturer_id, manufacturer_ref, product_id, False)
        tax_mode = changes.get("list_price_tax_mode", product.list_price_tax_mode)
        vat_bp = changes.get("list_price_vat_bp", product.list_price_vat_bp)
        if tax_mode == "ttc" and vat_bp is None:
            raise ValidationAppError([ErrorDetail("listPriceVatBp", fr.PRODUCT_TTC_NEEDS_VAT)])
        for field_name, value in changes.items():
            setattr(product, field_name, value)
        product.updated_at = stamp(clock)
    return product


def archive_product(session: Session, product_id: int, clock: Clock) -> Product:
    return common_archive(session, Product, product_id, RESOURCE, clock)


def unarchive_product(session: Session, product_id: int, clock: Clock) -> Product:
    return common_unarchive(session, Product, product_id, RESOURCE, clock)


# --- file junctions (D6b.11) ----------------------------------------------------------------


def _junction(product: Product, file_id: int) -> ProductFile:
    for junction in product.files:
        if junction.file_id == file_id:
            return junction
    raise ConflictError(fr.PRODUCT_FILE_NOT_ATTACHED)


def _clear_primary(product: Product, except_file_id: int) -> None:
    for junction in product.files:
        if junction.file_id != except_file_id and junction.is_primary:
            junction.is_primary = 0


def attach_file(
    session: Session, product_id: int, data: ProductFileAttach, clock: Clock
) -> Product:
    with session.begin():
        product = ensure_active(get_product(session, product_id), RESOURCE)
        get_file(session, data.file_id)
        if any(j.file_id == data.file_id for j in product.files):
            raise ConflictError(fr.PRODUCT_FILE_ALREADY_ATTACHED)
        if data.is_primary and data.kind != "image":
            raise ValidationAppError([ErrorDetail("isPrimary", fr.PRODUCT_FILE_PRIMARY_NOT_IMAGE)])
        if data.is_primary:
            _clear_primary(product, data.file_id)
        session.flush()  # the old primary is cleared before the partial unique index sees the new one
        now = stamp(clock)
        product.files.append(
            ProductFile(
                file_id=data.file_id,
                kind=data.kind,
                is_primary=int(data.is_primary),
                caption=data.caption,
                sort_order=data.sort_order,
                created_at=now,
                updated_at=now,
            )
        )
        product.updated_at = now
    session.refresh(product)
    return product


def update_file(
    session: Session, product_id: int, file_id: int, data: ProductFileUpdate, clock: Clock
) -> Product:
    with session.begin():
        product = ensure_active(get_product(session, product_id), RESOURCE)
        junction = _junction(product, file_id)
        changes = data.model_dump(exclude_unset=True)
        kind = changes.get("kind", junction.kind)
        is_primary = changes.get("is_primary", bool(junction.is_primary))
        if is_primary and kind != "image":
            raise ValidationAppError([ErrorDetail("isPrimary", fr.PRODUCT_FILE_PRIMARY_NOT_IMAGE)])
        if is_primary:
            _clear_primary(product, file_id)
            session.flush()
        if "license_note" in changes:
            junction.file.license_note = changes.pop("license_note")
        for field_name, value in changes.items():
            setattr(junction, field_name, int(value) if field_name == "is_primary" else value)
        junction.updated_at = product.updated_at = stamp(clock)
    session.refresh(product)
    return product


def detach_file(
    session: Session, product_id: int, file_id: int, files_dir: Path, clock: Clock
) -> Product:
    with session.begin():
        product = ensure_active(get_product(session, product_id), RESOURCE)
        junction = _junction(product, file_id)
        product.files.remove(junction)
        product.updated_at = stamp(clock)
    unlink_if_orphan(session, files_dir, file_id)
    session.refresh(product)
    return product
