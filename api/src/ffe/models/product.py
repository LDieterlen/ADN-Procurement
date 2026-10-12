"""`product`: reusable catalogue sheet; a project line copies what it needs (DATA_MODEL §4.8)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin
from ffe.models.product_file import ProductFile


class Product(TimestampedMixin, Base):
    __tablename__ = "product"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("list_price_cents IS NULL OR list_price_cents >= 0", name="list_price_min"),
        CheckConstraint("length(currency) = 3", name="currency_length"),
        Index("ix_product_category_id", "category_id"),
        Index("ix_product_manufacturer_id", "manufacturer_id", "reference"),
        Index("ix_product_supplier_id", "supplier_id"),
        Index("ix_product_archived_at", "archived_at", "name"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT"), nullable=False
    )
    manufacturer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("manufacturer.id", ondelete="RESTRICT")
    )
    reference: Mapped[str | None] = mapped_column(Text)
    supplier_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT")
    )
    list_price_cents: Mapped[int | None] = mapped_column(Integer)  # HT, in `currency`
    currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    dimensions: Mapped[str | None] = mapped_column(
        Text
    )  # free text, e.g. « L 120 × P 60 × H 75 cm »
    finish: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)

    files: Mapped[list[ProductFile]] = relationship(
        ProductFile,
        order_by=(ProductFile.sort_order, ProductFile.id),
        lazy="selectin",
        cascade="all, delete-orphan",
    )
