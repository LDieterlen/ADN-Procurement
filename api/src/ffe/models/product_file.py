"""`product_file`: product ↔ file junction (photos, datasheets, drawings), DATA_MODEL §4.10."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin
from ffe.models.file import File

FILE_KINDS = ("image", "datasheet", "drawing", "other")
FILE_KINDS_SQL = ", ".join(f"'{k}'" for k in FILE_KINDS)


class ProductFile(TimestampedMixin, Base):
    __tablename__ = "product_file"
    __table_args__ = (
        UniqueConstraint("product_id", "file_id", name="uq_product_file_product_id"),
        CheckConstraint(f"kind IN ({FILE_KINDS_SQL})", name="kind_enum"),
        CheckConstraint("is_primary IN (0, 1)", name="is_primary_bool"),
        CheckConstraint("is_primary = 0 OR kind = 'image'", name="primary_is_image"),
        Index("ix_product_file_file_id", "file_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("product.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="image")
    is_primary: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    caption: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    file: Mapped[File] = relationship(File, lazy="joined")


# One primary image per product (partial unique index, written by hand in the migration too).
Index(
    "uq_product_file_primary",
    ProductFile.product_id,
    unique=True,
    sqlite_where=ProductFile.is_primary == 1,
)
