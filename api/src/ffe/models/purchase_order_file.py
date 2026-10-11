"""`purchase_order_file`: the PDF sent and the supplier's acknowledgement (DATA_MODEL §4.22)."""

from sqlalchemy import ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin
from ffe.models.file import File


class PurchaseOrderFile(TimestampedMixin, Base):
    __tablename__ = "purchase_order_file"
    __table_args__ = (
        UniqueConstraint(
            "purchase_order_id", "file_id", name="uq_purchase_order_file_purchase_order_id"
        ),
        Index("ix_purchase_order_file_file_id", "file_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("purchase_order.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    caption: Mapped[str | None] = mapped_column(Text)

    file: Mapped[File] = relationship(File, lazy="joined")
