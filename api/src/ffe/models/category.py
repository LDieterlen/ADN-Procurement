"""`category`: the product type (assise, table, luminaire…), one level; its code prefixes item codes
(DATA_MODEL §4.5, ADR-0013)."""

from sqlalchemy import CheckConstraint, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Category(TimestampedMixin, Base):
    __tablename__ = "category"
    __table_args__ = (
        CheckConstraint(
            "code NOT GLOB '*[^A-Z]*' AND length(code) BETWEEN 2 AND 4", name="code_format"
        ),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        Index("ix_category_sort_order", "sort_order"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    archived_at: Mapped[str | None] = mapped_column(Text)


# Expression index (DATA_MODEL §3): written by hand in the migration too.
Index("uq_category_name_lower", func.lower(Category.name), unique=True)
