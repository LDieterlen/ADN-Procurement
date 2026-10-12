"""`project_item` schemas: creation (from the catalogue or free), partial update, placements,
status, journal (ADR-0013)."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema

ItemKind = Literal["product", "fee"]
ItemStatus = Literal[
    "to_quote", "quoted", "to_review", "approved", "deposit", "purchased", "cancelled"
]
ItemFamily = Literal["custom", "joinery", "ose", "edition", "gallery", "artwork", "textile"]
ItemUsage = Literal["indoor", "outdoor"]
ItemFileKind = Literal["image", "drawing", "other"]
EventKind = Literal["created", "status", "price", "product", "placement", "other"]

Short = Annotated[str | None, Field(max_length=200)]
Long = Annotated[str | None, Field(max_length=4000)]
Url = Annotated[str | None, Field(max_length=2000, pattern=r"^https?://")]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Cents = Annotated[int, Field(ge=0)]
Bp = Annotated[int, Field(ge=0, le=10000)]
Micro = Annotated[int, Field(ge=1)]
Milli = Annotated[int, Field(ge=0)]
ItemCode = Annotated[str, Field(min_length=1, max_length=20)]
Indice = Annotated[str | None, Field(max_length=10)]

TEXTS = ("name", "item_code", "reference", "finish", "dimensions", "quote_ref", "quote_indice")


def _strip(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


class PlacementCreate(BaseSchema):
    location_id: int | None = None  # None = « non affecté »
    qty_milli: Milli = 1000
    sort_order: int = 0


class PlacementUpdate(BaseSchema):
    location_id: int | None = None
    qty_milli: Milli | None = None
    sort_order: int | None = None

    @field_validator("qty_milli", "sort_order", mode="before")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return value


class PlacementRead(BaseSchema):
    id: int
    project_item_id: int
    location_id: int | None
    qty_milli: int
    sort_order: int
    created_at: str
    updated_at: str


class ProjectItemCreate(BaseSchema):
    """From a catalogue product (`productId`: every absent field is copied) or free. A free
    article is added to the catalogue unless `addToCatalogue` is false (ADR-0013)."""

    kind: ItemKind = "product"
    product_id: int | None = None
    add_to_catalogue: bool = True
    category_id: int | None = None
    manufacturer_id: int | None = None
    supplier_id: int | None = None
    name: Short = None
    reference: Short = None
    family: ItemFamily | None = None
    usage: ItemUsage | None = None
    finish: Short = None
    dimensions: Short = None
    source_url: Url = None
    comments: Long = None
    unit_cost_cents: Cents | None = None
    currency: Currency | None = None
    fx_rate_micro: Micro | None = None
    discount_bp: Bp | None = None
    quote_ref: Short = None
    quote_indice: Indice = None
    quote_url: Url = None
    item_code: ItemCode | None = None  # None = generated `<LOC>-<TYPE>-NN`
    sort_order: int = 0
    placements: list[PlacementCreate] | None = None  # None = one unassigned placement of 1

    @field_validator(*TEXTS, mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class ProjectItemUpdate(BaseSchema):
    """Absent = unchanged. `status` never here (POST …/status), placements have their own routes."""

    product_id: int | None = None
    category_id: int | None = None
    manufacturer_id: int | None = None
    supplier_id: int | None = None
    name: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    reference: Short = None
    family: ItemFamily | None = None
    usage: ItemUsage | None = None
    finish: Short = None
    dimensions: Short = None
    source_url: Url = None
    comments: Long = None
    unit_cost_cents: Cents | None = None
    currency: Currency | None = None
    fx_rate_micro: Micro | None = None
    discount_bp: Bp | None = None
    quote_ref: Short = None
    quote_indice: Indice = None
    quote_url: Url = None
    item_code: ItemCode | None = None
    sort_order: int | None = None

    @field_validator(
        "name",
        "unit_cost_cents",
        "currency",
        "fx_rate_micro",
        "discount_bp",
        "item_code",
        "sort_order",
        mode="before",
    )
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return _strip(value)

    @field_validator(
        "reference", "finish", "dimensions", "quote_ref", "quote_indice", mode="before"
    )
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return _strip(value)


class StatusChange(BaseSchema):
    status: ItemStatus
    note: Long = None


class ItemFileAttach(BaseSchema):
    file_id: int
    kind: ItemFileKind = "image"
    is_primary: bool = False
    caption: Short = None
    sort_order: int = 0


class ItemFileUpdate(BaseSchema):
    kind: ItemFileKind | None = None
    is_primary: bool | None = None
    caption: Short = None
    sort_order: int | None = None


class ItemFileRead(BaseSchema):
    file_id: int
    kind: ItemFileKind
    is_primary: bool
    caption: str | None
    sort_order: int
    sha256: str
    ext: str
    mime_type: str
    original_name: str
    size_bytes: int

    @classmethod
    def from_junction(cls, junction: Any) -> ItemFileRead:
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


class ProjectItemRead(BaseSchema):
    id: int
    project_id: int
    item_code: str
    kind: ItemKind
    category_id: int | None
    product_id: int | None
    manufacturer_id: int | None
    supplier_id: int | None
    name: str
    reference: str | None
    family: ItemFamily | None
    usage: ItemUsage | None
    finish: str | None
    dimensions: str | None
    source_url: str | None
    comments: str | None
    unit_cost_cents: int
    currency: str
    fx_rate_micro: int
    discount_bp: int
    quote_ref: str | None
    quote_indice: str | None
    quote_url: str | None
    status: ItemStatus
    indice: str | None
    sort_order: int
    created_at: str
    updated_at: str
    placements: list[PlacementRead]
    files: list[ItemFileRead]
    catalogue_image_file_id: (
        int | None
    )  # primary photo of the catalogue product, shown when the article has none

    @classmethod
    def from_model(cls, item: Any) -> ProjectItemRead:
        base = {
            name: getattr(item, name)
            for name in cls.model_fields
            if name not in ("placements", "files", "catalogue_image_file_id")
        }
        product = item.product
        catalogue_image = (
            next((f.file_id for f in product.files if f.is_primary), None) if product else None
        )
        return cls(
            **base,
            placements=[PlacementRead.model_validate(p) for p in item.placements],
            files=[ItemFileRead.from_junction(f) for f in item.files],
            catalogue_image_file_id=catalogue_image,
        )


class EventRead(BaseSchema):
    id: int
    project_item_id: int
    kind: str
    from_status: str | None
    to_status: str | None
    old_value: str | None
    new_value: str | None
    changed_at: str
    note: str | None
