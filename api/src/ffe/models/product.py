"""`product`: reusable catalogue sheet; a project line copies what it needs (DATA_MODEL §4.8)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin
from ffe.models.product_file import ProductFile

UNITS = ("piece", "pair", "set", "lot", "m", "m2", "roll")
UNITS_SQL = ", ".join(f"'{u}'" for u in UNITS)


class Product(TimestampedMixin, Base):
    __tablename__ = "product"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("gtin IS NULL OR gtin NOT GLOB '*[^0-9]*'", name="gtin_digits"),
        CheckConstraint(f"unit IN ({UNITS_SQL})", name="unit_enum"),
        CheckConstraint("list_price_cents IS NULL OR list_price_cents >= 0", name="list_price_min"),
        CheckConstraint("length(list_price_currency) = 3", name="list_price_currency_length"),
        CheckConstraint("list_price_tax_mode IN ('ht', 'ttc')", name="list_price_tax_mode_enum"),
        CheckConstraint(
            "list_price_vat_bp IS NULL OR list_price_vat_bp BETWEEN 0 AND 10000",
            name="list_price_vat_bp_range",
        ),
        CheckConstraint(
            "list_price_tax_mode = 'ht' OR list_price_vat_bp IS NOT NULL",
            name="list_price_ttc_needs_vat",
        ),
        CheckConstraint(
            f"list_price_on IS NULL OR list_price_on {DATE_GLOB}", name="list_price_on_date"
        ),
        CheckConstraint("lead_time_weeks IS NULL OR lead_time_weeks >= 0", name="lead_time_min"),
        CheckConstraint("width_mm IS NULL OR width_mm >= 0", name="width_min"),
        CheckConstraint("depth_mm IS NULL OR depth_mm >= 0", name="depth_min"),
        CheckConstraint("height_mm IS NULL OR height_mm >= 0", name="height_min"),
        CheckConstraint("diameter_mm IS NULL OR diameter_mm >= 0", name="diameter_min"),
        CheckConstraint(
            f"discontinued_on IS NULL OR discontinued_on {DATE_GLOB}", name="discontinued_on_date"
        ),
        Index("ix_product_category_id", "category_id"),
        Index("ix_product_manufacturer_id", "manufacturer_id", "manufacturer_ref"),
        Index("ix_product_supplier_id", "supplier_id"),
        Index("ix_product_archived_at", "archived_at", "name"),
        Index("ix_product_gtin", "gtin"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT"), nullable=False
    )
    manufacturer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("manufacturer.id", ondelete="RESTRICT")
    )
    manufacturer_ref: Mapped[str | None] = mapped_column(Text)
    gtin: Mapped[str | None] = mapped_column(Text)
    supplier_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT")
    )
    supplier_ref: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(Text, nullable=False, server_default="piece")
    list_price_cents: Mapped[int | None] = mapped_column(Integer)
    list_price_currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    list_price_tax_mode: Mapped[str] = mapped_column(Text, nullable=False, server_default="ht")
    list_price_vat_bp: Mapped[int | None] = mapped_column(Integer)
    list_price_on: Mapped[str | None] = mapped_column(Text)
    lead_time_weeks: Mapped[int | None] = mapped_column(Integer)
    width_mm: Mapped[int | None] = mapped_column(Integer)
    depth_mm: Mapped[int | None] = mapped_column(Integer)
    height_mm: Mapped[int | None] = mapped_column(Integer)
    diameter_mm: Mapped[int | None] = mapped_column(Integer)
    materials: Mapped[str | None] = mapped_column(Text)
    finish: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="manual")
    discontinued_on: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)

    files: Mapped[list[ProductFile]] = relationship(
        ProductFile,
        order_by=(ProductFile.sort_order, ProductFile.id),
        lazy="selectin",
        cascade="all, delete-orphan",
    )
