"""`category`: two-level tree; the level-1 code prefixes item codes (DATA_MODEL §4.5)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Category(TimestampedMixin, Base):
    __tablename__ = "category"
    __table_args__ = (
        CheckConstraint("(parent_id IS NULL) = (code IS NOT NULL)", name="code_on_level1_only"),
        CheckConstraint(
            "code IS NULL OR (code NOT GLOB '*[^A-Z]*' AND length(code) BETWEEN 2 AND 4)",
            name="code_format",
        ),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        Index("ix_category_parent_id", "parent_id", "sort_order"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT")
    )
    code: Mapped[str | None] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    archived_at: Mapped[str | None] = mapped_column(Text)


# Expression and partial unique indexes (DATA_MODEL §3): written by hand in the migration too.
Index("uq_category_parent_name", func.coalesce(Category.parent_id, 0), Category.name, unique=True)
Index("uq_category_code", Category.code, unique=True, sqlite_where=Category.code.is_not(None))
