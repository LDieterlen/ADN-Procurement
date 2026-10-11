"""`supplier_invoice`: invoices and their payment in one table (DATA_MODEL §4.26, ADR-0008)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin

INVOICE_KINDS = ("deposit", "balance", "other")
INVOICE_KINDS_SQL = ", ".join(f"'{k}'" for k in INVOICE_KINDS)


class SupplierInvoice(TimestampedMixin, Base):
    __tablename__ = "supplier_invoice"
    __table_args__ = (
        UniqueConstraint(
            "purchase_order_id", "reference", name="uq_supplier_invoice_purchase_order_id"
        ),
        CheckConstraint(f"kind IN ({INVOICE_KINDS_SQL})", name="kind_enum"),
        CheckConstraint("length(reference) > 0", name="reference_not_empty"),
        CheckConstraint(f"invoiced_on {DATE_GLOB}", name="invoiced_on_date"),
        CheckConstraint(f"due_on IS NULL OR due_on {DATE_GLOB}", name="due_on_date"),
        CheckConstraint(f"paid_on IS NULL OR paid_on {DATE_GLOB}", name="paid_on_date"),
        CheckConstraint("amount_ht_cents >= 0", name="amount_ht_min"),
        CheckConstraint("vat_cents >= 0", name="vat_min"),
        Index("ix_supplier_invoice_purchase_order_id", "purchase_order_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("purchase_order.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="balance")
    reference: Mapped[str] = mapped_column(Text, nullable=False)
    invoiced_on: Mapped[str] = mapped_column(Text, nullable=False)
    due_on: Mapped[str | None] = mapped_column(Text)
    amount_ht_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    vat_cents: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    paid_on: Mapped[str | None] = mapped_column(Text)
    payment_ref: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
