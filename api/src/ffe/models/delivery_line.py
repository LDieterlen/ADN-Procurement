"""`delivery_line`: quantity received for one purchase-order line, with reservations (DATA_MODEL §4.25)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class DeliveryLine(TimestampedMixin, Base):
    __tablename__ = "delivery_line"
    __table_args__ = (
        UniqueConstraint(
            "delivery_id", "purchase_order_line_id", name="uq_delivery_line_delivery_id"
        ),
        CheckConstraint("qty_milli > 0", name="qty_positive"),
        Index("ix_delivery_line_purchase_order_line_id", "purchase_order_line_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    delivery_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("delivery.id", ondelete="CASCADE"), nullable=False
    )
    purchase_order_line_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("purchase_order_line.id", ondelete="RESTRICT"), nullable=False
    )
    qty_milli: Mapped[int] = mapped_column(Integer, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text)
