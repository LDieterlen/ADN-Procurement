"""`purchase_order`: one project, one supplier, one currency; `PO-YYYY-NNN` (DATA_MODEL §4.20, ADR-0007)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin
from ffe.models.purchase_order_file import PurchaseOrderFile
from ffe.models.purchase_order_line import PurchaseOrderLine

PO_STATUSES = ("draft", "issued", "acknowledged", "partially_delivered", "closed", "cancelled")
PO_STATUSES_SQL = ", ".join(f"'{s}'" for s in PO_STATUSES)
PO_ENGAGED_STATUSES = frozenset({"issued", "acknowledged", "partially_delivered", "closed"})


class PurchaseOrder(TimestampedMixin, Base):
    __tablename__ = "purchase_order"
    __table_args__ = (
        UniqueConstraint("number", name="uq_purchase_order_number"),
        CheckConstraint("number GLOB 'PO-[0-9][0-9][0-9][0-9]-*'", name="number_format"),
        CheckConstraint(f"status IN ({PO_STATUSES_SQL})", name="status_enum"),
        CheckConstraint("length(currency) = 3", name="currency_iso"),
        CheckConstraint("fx_rate_micro >= 1", name="fx_rate_min"),
        CheckConstraint("currency <> 'EUR' OR fx_rate_micro = 1000000", name="eur_rate_is_one"),
        CheckConstraint(f"issued_on IS NULL OR issued_on {DATE_GLOB}", name="issued_on_date"),
        CheckConstraint(
            f"expected_delivery_on IS NULL OR expected_delivery_on {DATE_GLOB}",
            name="expected_delivery_on_date",
        ),
        Index("ix_purchase_order_project_id", "project_id"),
        Index("ix_purchase_order_supplier_id", "supplier_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    supplier_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False
    )
    number: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="draft")
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    fx_rate_micro: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1000000")
    )
    issued_on: Mapped[str | None] = mapped_column(Text)
    expected_delivery_on: Mapped[str | None] = mapped_column(Text)
    supplier_ref: Mapped[str | None] = mapped_column(Text)
    delivery_address: Mapped[str | None] = mapped_column(Text)
    delivery_contact: Mapped[str | None] = mapped_column(Text)
    payment_terms: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    internal_notes: Mapped[str | None] = mapped_column(Text)

    lines: Mapped[list[PurchaseOrderLine]] = relationship(
        PurchaseOrderLine,
        order_by=(PurchaseOrderLine.sort_order, PurchaseOrderLine.id),
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    files: Mapped[list[PurchaseOrderFile]] = relationship(
        PurchaseOrderFile,
        order_by=PurchaseOrderFile.id,
        lazy="selectin",
        cascade="all, delete-orphan",
    )
