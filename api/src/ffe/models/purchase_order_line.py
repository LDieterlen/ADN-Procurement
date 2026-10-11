"""`purchase_order_line`: frozen copy of an approved project line on a purchase order (DATA_MODEL §4.21)."""

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class PurchaseOrderLine(TimestampedMixin, Base):
    __tablename__ = "purchase_order_line"
    __table_args__ = (
        UniqueConstraint(
            "purchase_order_id", "project_item_id", name="uq_purchase_order_line_purchase_order_id"
        ),
        ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_purchase_order_line_project_item_id_project_item",
            ondelete="RESTRICT",
        ),
        CheckConstraint("length(description) > 0", name="description_not_empty"),
        CheckConstraint("qty_milli >= 0", name="qty_min"),
        CheckConstraint("unit_cost_cents >= 0", name="unit_cost_min"),
        CheckConstraint("discount_bp BETWEEN 0 AND 10000", name="discount_bp_range"),
        CheckConstraint("vat_rate_bp BETWEEN 0 AND 10000", name="vat_rate_bp_range"),
        Index("ix_purchase_order_line_project_item_id", "project_item_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("purchase_order.id", ondelete="CASCADE"), nullable=False
    )
    project_item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    qty_milli: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_bp: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    vat_rate_bp: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
