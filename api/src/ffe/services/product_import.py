"""Price-list import service (ADR-0011): preview never writes; commit creates/updates products,
records one price observation per priced row, keeps the file and the batch, saves the mapping."""

import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.imports.price_import import (
    ExistingProduct,
    Mapping,
    PlanRow,
    Sheet,
    guess_mapping,
    plan_rows,
    read_sheet,
)
from ffe.models import Category, ImportBatch, Manufacturer, PriceObservation, Product, Supplier
from ffe.schemas.product_import import (
    ImportBatchRead,
    ImportCommitRead,
    ImportCounts,
    ImportMapping,
    ImportPreviewRead,
    PlanRowRead,
)
from ffe.services.base import normalize_key, stamp
from ffe.services.file import store_bytes

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
CSV_MIME = "text/csv"
SAMPLE_ROWS = 5


def _err(field: str, message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail(field, message)])


def _supplier(session: Session, supplier_id: int) -> Supplier:
    supplier = session.get(Supplier, supplier_id)
    if supplier is None:
        raise _err("supplierId", fr.IMPORT_SUPPLIER_NOT_FOUND)
    if supplier.archived_at is not None:
        raise _err("supplierId", fr.IMPORT_SUPPLIER_ARCHIVED)
    return supplier


def supplier_or_422(session: Session, supplier_id: int) -> Supplier:
    return _supplier(session, supplier_id)


def saved_mapping(supplier: Supplier) -> ImportMapping | None:
    if not supplier.import_mapping:
        return None
    try:
        return ImportMapping.model_validate(json.loads(supplier.import_mapping))
    except ValueError, ValidationError:
        return None


def _resolve_mapping(
    session: Session, supplier: Supplier, given: ImportMapping | None, columns: list[str]
) -> tuple[Mapping, ImportMapping, str]:
    source = "given"
    dto = given
    if dto is None:
        dto = saved_mapping(supplier)
        source = "saved"
    if dto is None:
        dto = ImportMapping(
            columns={k: v for k, v in guess_mapping(columns).items()},  # type: ignore[misc]
            tax_mode="ht",
            vat_bp=None,
            default_category_id=None,
            currency=None,
        )
        source = "guessed"
    for field_name, column in dto.columns.items():
        if column and column not in columns:
            raise _err(
                f"mapping.columns.{field_name}",
                fr.IMPORT_COLUMN_UNKNOWN.format(column=column, field=field_name),
            )
    if source == "given" and not dto.columns.get("listPrice"):
        raise _err("mapping.columns.listPrice", fr.IMPORT_PRICE_COLUMN_REQUIRED)
    if dto.tax_mode == "ttc" and dto.vat_bp is None:
        raise _err("mapping.vatBp", fr.IMPORT_TTC_NEEDS_VAT)
    if (
        dto.default_category_id is not None
        and session.get(Category, dto.default_category_id) is None
    ):
        raise _err("mapping.defaultCategoryId", fr.IMPORT_CATEGORY_NOT_FOUND)
    mapping = Mapping(
        columns={k: v for k, v in dto.columns.items() if v},
        tax_mode=dto.tax_mode,
        vat_bp=dto.vat_bp,
        default_category_id=dto.default_category_id,
        currency=dto.currency or supplier.currency,
    )
    return mapping, dto, source


def _existing(session: Session, supplier_id: int) -> list[ExistingProduct]:
    rows = session.scalars(select(Product).where(Product.supplier_id == supplier_id))
    return [
        ExistingProduct(
            id=p.id,
            name=p.name,
            manufacturer_id=p.manufacturer_id,
            manufacturer_ref=p.manufacturer_ref,
            gtin=p.gtin,
            supplier_ref=p.supplier_ref,
            list_price_cents=p.list_price_cents,
            list_price_currency=p.list_price_currency,
            list_price_tax_mode=p.list_price_tax_mode,
            archived=p.archived_at is not None,
        )
        for p in rows
    ]


def _manufacturers(session: Session) -> dict[str, int]:
    return {
        normalize_key(m.name): m.id
        for m in session.scalars(select(Manufacturer))
        if m.archived_at is None
    }


def _counts(plan: list[PlanRow], discontinued: int = 0) -> ImportCounts:
    return ImportCounts(
        total=len(plan),
        create=sum(1 for r in plan if r.action == "create"),
        update=sum(1 for r in plan if r.action == "update"),
        unchanged=sum(1 for r in plan if r.action == "unchanged"),
        skip=sum(1 for r in plan if r.action == "skip"),
        discontinued=discontinued,
    )


def _missing_refs(plan: list[PlanRow], existing: list[ExistingProduct]) -> list[str]:
    seen = {normalize_key(r.supplier_ref) for r in plan if r.supplier_ref}
    return sorted(
        p.supplier_ref
        for p in existing
        if p.supplier_ref and not p.archived and normalize_key(p.supplier_ref) not in seen
    )


def _read(data: bytes, filename: str) -> Sheet:
    lower = filename.lower()
    if not (lower.endswith((".xlsx", ".xlsm", ".csv", ".txt")) or data[:2] == b"PK"):
        raise _err("file", fr.IMPORT_FILE_TYPE)
    sheet = read_sheet(data, filename)
    if not sheet.columns:
        raise _err("file", fr.IMPORT_FILE_EMPTY)
    return sheet


def preview(
    session: Session, supplier_id: int, data: bytes, filename: str, given: ImportMapping | None
) -> ImportPreviewRead:
    supplier = _supplier(session, supplier_id)
    sheet = _read(data, filename)
    mapping, dto, source = _resolve_mapping(session, supplier, given, sheet.columns)
    existing = _existing(session, supplier_id)
    plan = plan_rows(sheet, mapping, existing, _manufacturers(session))
    return ImportPreviewRead(
        supplier_id=supplier_id,
        filename=filename,
        columns=sheet.columns,
        sample=sheet.rows[:SAMPLE_ROWS],
        mapping=dto,
        mapping_source=source,  # type: ignore[arg-type]
        counts=_counts(plan),
        rows=[PlanRowRead(**_row_dict(r)) for r in plan],
        missing_supplier_refs=_missing_refs(plan, existing),
    )


def _row_dict(row: PlanRow) -> dict[str, Any]:
    return {
        "row_index": row.row_index,
        "action": row.action,
        "reason": row.reason,
        "matched_by": row.matched_by,
        "product_id": row.product_id,
        "name": row.name,
        "supplier_ref": row.supplier_ref,
        "manufacturer_ref": row.manufacturer_ref,
        "manufacturer_name": row.manufacturer_name,
        "gtin": row.gtin,
        "old_price_cents": row.old_price_cents,
        "new_price_cents": row.new_price_cents,
        "lead_time_weeks": row.lead_time_weeks,
        "finish": row.finish,
    }


def batch_read(batch: ImportBatch) -> ImportBatchRead:
    return ImportBatchRead(
        id=batch.id,
        supplier_id=batch.supplier_id,
        file_id=batch.file_id,
        original_name=batch.file.original_name,
        imported_at=batch.imported_at,
        rows_total=batch.rows_total,
        rows_created=batch.rows_created,
        rows_updated=batch.rows_updated,
        rows_unchanged=batch.rows_unchanged,
        rows_skipped=batch.rows_skipped,
        rows_discontinued=batch.rows_discontinued,
    )


def list_batches(session: Session, supplier_id: int | None) -> list[ImportBatch]:
    query = select(ImportBatch).order_by(ImportBatch.imported_at.desc(), ImportBatch.id.desc())
    if supplier_id is not None:
        query = query.where(ImportBatch.supplier_id == supplier_id)
    return list(session.scalars(query))


def commit(
    session: Session,
    files_dir: Path,
    supplier_id: int,
    data: bytes,
    filename: str,
    given: ImportMapping | None,
    mark_missing_discontinued: bool,
    clock: Clock,
) -> ImportCommitRead:
    """Applies the plan of `preview` in one transaction (ADR-0011)."""
    today = clock().date().isoformat()
    with session.begin():
        supplier = _supplier(session, supplier_id)
        sheet = _read(data, filename)
        mapping, dto, source = _resolve_mapping(session, supplier, given, sheet.columns)
        if source == "guessed":
            raise _err("mapping", fr.IMPORT_NO_SAVED_MAPPING)
        existing = _existing(session, supplier_id)
        manufacturers = _manufacturers(session)
        now = stamp(clock)
        # Manufacturers named in the file but unknown are created first (plan needs their ids).
        for row in sheet.rows:
            column = mapping.columns.get("manufacturerName")
            name = row.get(column, "").strip() if column else ""
            if name and normalize_key(name) not in manufacturers:
                manufacturer = Manufacturer(name=name, created_at=now, updated_at=now)
                session.add(manufacturer)
                session.flush()
                manufacturers[normalize_key(name)] = manufacturer.id
        plan = plan_rows(sheet, mapping, existing, manufacturers)
        mime = XLSX_MIME if data[:2] == b"PK" else CSV_MIME
        ext = "xlsx" if data[:2] == b"PK" else "csv"
        file = store_bytes(
            session, files_dir, data, filename, mime, ext, clock, in_transaction=True
        )
        batch = ImportBatch(
            supplier_id=supplier_id,
            file_id=file.id,
            mapping_json=json.dumps(dto.model_dump(by_alias=True), ensure_ascii=False),
            imported_at=now,
        )
        session.add(batch)
        session.flush()
        created: list[int] = []
        updated: list[int] = []
        for row in plan:
            if row.action == "skip":
                continue
            manufacturer_id = (
                manufacturers.get(normalize_key(row.manufacturer_name))
                if row.manufacturer_name
                else None
            )
            if row.action == "create":
                assert mapping.default_category_id is not None and row.name
                product = Product(
                    name=row.name,
                    category_id=mapping.default_category_id,
                    manufacturer_id=manufacturer_id,
                    manufacturer_ref=row.manufacturer_ref,
                    gtin=row.gtin,
                    supplier_id=supplier_id,
                    supplier_ref=row.supplier_ref,
                    list_price_cents=row.new_price_cents,
                    list_price_currency=mapping.currency,
                    list_price_tax_mode=mapping.tax_mode,
                    list_price_vat_bp=mapping.vat_bp,
                    list_price_on=today if row.new_price_cents is not None else None,
                    lead_time_weeks=row.lead_time_weeks,
                    finish=row.finish,
                    source_kind="import",
                    created_at=now,
                    updated_at=now,
                )
                session.add(product)
                session.flush()
                created.append(product.id)
            else:
                product = session.get(Product, row.product_id)
                assert product is not None
                if row.action == "update":
                    product.list_price_cents = row.new_price_cents
                    product.list_price_currency = mapping.currency
                    product.list_price_tax_mode = mapping.tax_mode
                    product.list_price_vat_bp = mapping.vat_bp
                    product.list_price_on = today
                    updated.append(product.id)
                if (
                    row.lead_time_weeks is not None
                    and product.lead_time_weeks != row.lead_time_weeks
                ):
                    product.lead_time_weeks = row.lead_time_weeks
                if row.finish and product.finish != row.finish:
                    product.finish = row.finish
                if row.gtin and not product.gtin:
                    product.gtin = row.gtin
                if row.supplier_ref and not product.supplier_ref:
                    product.supplier_ref = row.supplier_ref
                if manufacturer_id and product.manufacturer_id is None:
                    product.manufacturer_id = manufacturer_id
                    product.manufacturer_ref = product.manufacturer_ref or row.manufacturer_ref
                product.updated_at = now
            if row.new_price_cents is not None:
                session.add(
                    PriceObservation(
                        import_batch_id=batch.id,
                        product_id=product.id,
                        list_price_cents=row.new_price_cents,
                        list_price_currency=mapping.currency,
                        list_price_tax_mode=mapping.tax_mode,
                        observed_on=today,
                    )
                )
        discontinued = 0
        if mark_missing_discontinued:
            for ref in _missing_refs(plan, existing):
                for product in session.scalars(
                    select(Product).where(
                        Product.supplier_id == supplier_id, Product.supplier_ref == ref
                    )
                ):
                    if product.discontinued_on is None:
                        product.discontinued_on = today
                        product.updated_at = now
                        discontinued += 1
        counts = _counts(plan, discontinued)
        batch.rows_total = counts.total
        batch.rows_created = counts.create
        batch.rows_updated = counts.update
        batch.rows_unchanged = counts.unchanged
        batch.rows_skipped = counts.skip
        batch.rows_discontinued = discontinued
        supplier.import_mapping = batch.mapping_json
        supplier.updated_at = now
    session.refresh(batch)
    return ImportCommitRead(
        batch=batch_read(batch),
        counts=counts,
        created_product_ids=created,
        updated_product_ids=updated,
    )
