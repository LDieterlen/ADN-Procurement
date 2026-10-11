"""Price-list import DTOs (ADR-0011): mapping, preview plan, batch."""

from typing import Annotated, Literal

from pydantic import Field

from ffe.schemas.base import BaseSchema

ImportField = Literal[
    "name",
    "supplierRef",
    "manufacturerRef",
    "gtin",
    "listPrice",
    "leadTimeWeeks",
    "finish",
    "manufacturerName",
]
TaxMode = Literal["ht", "ttc"]
PlanAction = Literal["create", "update", "unchanged", "skip"]


class ImportMapping(BaseSchema):
    columns: dict[ImportField, str]
    tax_mode: TaxMode
    vat_bp: Annotated[int | None, Field(ge=0, le=10000)] = None
    default_category_id: int | None = None
    currency: Annotated[str | None, Field(pattern=r"^[A-Z]{3}$")] = None  # None = supplier currency


class PlanRowRead(BaseSchema):
    row_index: int
    action: PlanAction
    reason: str | None
    matched_by: str | None
    product_id: int | None
    name: str | None
    supplier_ref: str | None
    manufacturer_ref: str | None
    manufacturer_name: str | None
    gtin: str | None
    old_price_cents: int | None
    new_price_cents: int | None
    lead_time_weeks: int | None
    finish: str | None


class ImportCounts(BaseSchema):
    total: int
    create: int
    update: int
    unchanged: int
    skip: int
    discontinued: int = 0


class ImportPreviewRead(BaseSchema):
    supplier_id: int
    filename: str
    columns: list[str]
    sample: list[dict[str, str]]  # first rows, as read
    mapping: ImportMapping  # the one applied (given, saved, or guessed)
    mapping_source: Literal["given", "saved", "guessed"]
    counts: ImportCounts
    rows: list[PlanRowRead]
    missing_supplier_refs: list[str]  # products of the supplier absent from the file


class ImportBatchRead(BaseSchema):
    id: int
    supplier_id: int
    file_id: int
    original_name: str
    imported_at: str
    rows_total: int
    rows_created: int
    rows_updated: int
    rows_unchanged: int
    rows_skipped: int
    rows_discontinued: int


class ImportCommitRead(BaseSchema):
    batch: ImportBatchRead
    counts: ImportCounts
    created_product_ids: list[int]
    updated_product_ids: list[int]
