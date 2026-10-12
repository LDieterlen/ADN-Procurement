"""`product` schemas, with its attached files (D6b.7) and junction payloads (D6b.11)."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

FileKind = Literal["image", "datasheet", "drawing", "other"]

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=4000)]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Cents = Annotated[int | None, Field(ge=0)]
Url = Annotated[str | None, Field(max_length=2000, pattern=r"^https?://")]

STRIPPED = ("name", "reference", "finish", "dimensions")


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class ProductCreate(BaseSchema):
    name: Name
    category_id: int
    reference: Short = None
    supplier_id: int | None = None
    list_price_cents: Cents = None
    currency: Currency = "EUR"
    dimensions: Short = None
    finish: Short = None
    source_url: Url = None
    notes: Long = None

    @field_validator(*STRIPPED, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ProductUpdate(BaseSchema):
    name: Name | None = None
    category_id: int | None = None
    reference: Short = None
    supplier_id: int | None = None
    list_price_cents: Cents = None
    currency: Currency | None = None
    dimensions: Short = None
    finish: Short = None
    source_url: Url = None
    notes: Long = None

    @field_validator("name", "category_id", "currency", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator("reference", "finish", "dimensions", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ProductFileRead(BaseSchema):
    file_id: int
    kind: FileKind
    is_primary: bool
    caption: str | None
    sort_order: int
    license_note: str | None = None
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
            license_note=junction.file.license_note,
        )


class ProductRead(BaseSchema):
    id: int
    name: str
    category_id: int
    reference: str | None
    supplier_id: int | None
    list_price_cents: int | None
    currency: str
    dimensions: str | None
    finish: str | None
    source_url: str | None
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
    license_note: Short = None  # carried by the file, not the junction
