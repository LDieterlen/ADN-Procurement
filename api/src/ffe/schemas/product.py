"""`product` schemas, with its attached files (D6b.7) and junction payloads (D6b.11)."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator, model_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

Unit = Literal["piece", "pair", "set", "lot", "m", "m2", "roll"]
TaxMode = Literal["ht", "ttc"]
SourceKind = Literal["manual", "url"]
FileKind = Literal["image", "datasheet", "drawing", "other"]

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=4000)]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Gtin = Annotated[str | None, Field(pattern=r"^[0-9]{8,14}$")]
Date = Annotated[str | None, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
Cents = Annotated[int | None, Field(ge=0)]
Bp = Annotated[int | None, Field(ge=0, le=10000)]
Mm = Annotated[int | None, Field(ge=0)]
Weeks = Annotated[int | None, Field(ge=0)]
Url = Annotated[str | None, Field(max_length=2000, pattern=r"^https?://")]

STRIPPED = ("name", "manufacturer_ref", "supplier_ref", "gtin", "finish", "color", "materials")


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ProductCreate(BaseSchema):
    name: Name
    description: Long = None
    category_id: int
    manufacturer_id: int | None = None
    manufacturer_ref: Short = None
    gtin: Gtin = None
    supplier_id: int | None = None
    supplier_ref: Short = None
    unit: Unit = "piece"
    list_price_cents: Cents = None
    list_price_currency: Currency = "EUR"
    list_price_tax_mode: TaxMode = "ht"
    list_price_vat_bp: Bp = None
    list_price_on: Date = None
    lead_time_weeks: Weeks = None
    width_mm: Mm = None
    depth_mm: Mm = None
    height_mm: Mm = None
    diameter_mm: Mm = None
    materials: Short = None
    finish: Short = None
    color: Short = None
    source_url: Url = None
    source_kind: SourceKind = "manual"
    discontinued_on: Date = None
    notes: Long = None

    @field_validator(*STRIPPED, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)

    @model_validator(mode="after")
    def ttc_needs_vat(self) -> ProductCreate:
        if self.list_price_tax_mode == "ttc" and self.list_price_vat_bp is None:
            raise ValueError(fr.PRODUCT_TTC_NEEDS_VAT)
        return self


class ProductUpdate(BaseSchema):
    name: Name | None = None
    description: Long = None
    category_id: int | None = None
    manufacturer_id: int | None = None
    manufacturer_ref: Short = None
    gtin: Gtin = None
    supplier_id: int | None = None
    supplier_ref: Short = None
    unit: Unit | None = None
    list_price_cents: Cents = None
    list_price_currency: Currency | None = None
    list_price_tax_mode: TaxMode | None = None
    list_price_vat_bp: Bp = None
    list_price_on: Date = None
    lead_time_weeks: Weeks = None
    width_mm: Mm = None
    depth_mm: Mm = None
    height_mm: Mm = None
    diameter_mm: Mm = None
    materials: Short = None
    finish: Short = None
    color: Short = None
    source_url: Url = None
    source_kind: SourceKind | None = None
    discontinued_on: Date = None
    notes: Long = None

    @field_validator(
        "name",
        "category_id",
        "unit",
        "list_price_currency",
        "list_price_tax_mode",
        "source_kind",
        mode="before",
    )
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator(
        "manufacturer_ref", "supplier_ref", "gtin", "finish", "color", "materials", mode="before"
    )
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ProductFileRead(BaseSchema):
    file_id: int
    kind: FileKind
    is_primary: bool
    caption: str | None
    sort_order: int
    sha256: str
    ext: str
    mime_type: str
    original_name: str
    size_bytes: int

    @classmethod
    def from_junction(cls, junction: Any) -> ProductFileRead:
        return cls(
            file_id=junction.file_id,
            kind=junction.kind,
            is_primary=bool(junction.is_primary),
            caption=junction.caption,
            sort_order=junction.sort_order,
            sha256=junction.file.sha256,
            ext=junction.file.ext,
            mime_type=junction.file.mime_type,
            original_name=junction.file.original_name,
            size_bytes=junction.file.size_bytes,
        )


class ProductRead(BaseSchema):
    id: int
    name: str
    description: str | None
    category_id: int
    manufacturer_id: int | None
    manufacturer_ref: str | None
    gtin: str | None
    supplier_id: int | None
    supplier_ref: str | None
    unit: Unit
    list_price_cents: int | None
    list_price_currency: str
    list_price_tax_mode: TaxMode
    list_price_vat_bp: int | None
    list_price_on: str | None
    lead_time_weeks: int | None
    width_mm: int | None
    depth_mm: int | None
    height_mm: int | None
    diameter_mm: int | None
    materials: str | None
    finish: str | None
    color: str | None
    source_url: str | None
    source_kind: SourceKind
    discontinued_on: str | None
    notes: str | None
    archived_at: str | None
    created_at: str
    updated_at: str
    files: list[ProductFileRead]

    @classmethod
    def from_model(cls, product: Any) -> ProductRead:
        base = {name: getattr(product, name) for name in cls.model_fields if name != "files"}
        return cls(**base, files=[ProductFileRead.from_junction(j) for j in product.files])


class ProductFileAttach(BaseSchema):
    file_id: int
    kind: FileKind = "image"
    is_primary: bool = False
    caption: Short = None
    sort_order: int = 0


class ProductFileUpdate(BaseSchema):
    kind: FileKind | None = None
    is_primary: bool | None = None
    caption: Short = None
    sort_order: int | None = None
