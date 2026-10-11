"""`delivery`: one receipt of a purchase order, partial or complete (DATA_MODEL §4.24, ADR-0008)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin
from ffe.models.delivery_line import DeliveryLine


class Delivery(TimestampedMixin, Base):
    __tablename__ = "delivery"
    __table_args__ = (
        CheckConstraint(f"received_on {DATE_GLOB}", name="received_on_date"),
        Index("ix_delivery_purchase_order_id", "purchase_order_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("purchase_order.id", ondelete="RESTRICT"), nullable=False
    )
    received_on: Mapped[str] = mapped_column(Text, nullable=False)
    reference: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    lines: Mapped[list[DeliveryLine]] = relationship(
        DeliveryLine, order_by=DeliveryLine.id, lazy="selectin", cascade="all, delete-orphan"
    )
