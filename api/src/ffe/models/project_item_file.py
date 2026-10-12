"""`project_item_file`: photos and drawings of a line (DATA_MODEL §4.15), same shape as product_file."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin
from ffe.models.file import File

ITEM_FILE_KINDS = ("image", "drawing", "other")
ITEM_FILE_KINDS_SQL = ", ".join(f"'{k}'" for k in ITEM_FILE_KINDS)


class ProjectItemFile(TimestampedMixin, Base):
    __tablename__ = "project_item_file"
    __table_args__ = (
        UniqueConstraint("project_item_id", "file_id", name="uq_project_item_file_project_item_id"),
        CheckConstraint(f"kind IN ({ITEM_FILE_KINDS_SQL})", name="kind_enum"),
        CheckConstraint("is_primary IN (0, 1)", name="is_primary_bool"),
        CheckConstraint("is_primary = 0 OR kind = 'image'", name="primary_is_image"),
        Index("ix_project_item_file_file_id", "file_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project_item.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="image")
    is_primary: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    caption: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    file: Mapped[File] = relationship(File, lazy="joined")


Index(
    "uq_project_item_file_primary",
    ProjectItemFile.project_item_id,
    unique=True,
    sqlite_where=ProjectItemFile.is_primary == 1,
)
