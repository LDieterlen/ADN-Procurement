"""`import_batch`: one supplier price-list import, its file, mapping and counts (DATA_MODEL §4.28)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base
from ffe.models.file import File


class ImportBatch(Base):
    __tablename__ = "import_batch"
    __table_args__ = (
        CheckConstraint(
            "rows_total >= 0 AND rows_created >= 0 AND rows_updated >= 0 AND rows_unchanged >= 0 "
            "AND rows_skipped >= 0 AND rows_discontinued >= 0",
            name="counts_min",
        ),
        Index("ix_import_batch_supplier_id", "supplier_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False
    )
    file_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    mapping_json: Mapped[str] = mapped_column(Text, nullable=False)
    imported_at: Mapped[str] = mapped_column(Text, nullable=False)
    rows_total: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    rows_created: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    rows_updated: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    rows_unchanged: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    rows_skipped: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    rows_discontinued: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )

    file: Mapped[File] = relationship(File, lazy="joined")
