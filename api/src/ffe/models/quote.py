"""`quote`: a supplier's quote for one project, in its currency with a frozen rate (DATA_MODEL §4.17)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin
from ffe.models.quote_file import QuoteFile
from ffe.models.quote_line import QuoteLine


class Quote(TimestampedMixin, Base):
    __tablename__ = "quote"
    __table_args__ = (
        UniqueConstraint("project_id", "supplier_id", "reference", name="uq_quote_project_id"),
        CheckConstraint("length(reference) > 0", name="reference_not_empty"),
        CheckConstraint(f"quoted_on IS NULL OR quoted_on {DATE_GLOB}", name="quoted_on_date"),
        CheckConstraint(f"valid_until IS NULL OR valid_until {DATE_GLOB}", name="valid_until_date"),
        CheckConstraint(
            "valid_until IS NULL OR quoted_on IS NULL OR valid_until >= quoted_on",
            name="valid_after_quoted",
        ),
        CheckConstraint("length(currency) = 3", name="currency_iso"),
        CheckConstraint("fx_rate_micro >= 1", name="fx_rate_min"),
        CheckConstraint("currency <> 'EUR' OR fx_rate_micro = 1000000", name="eur_rate_is_one"),
        Index("ix_quote_supplier_id", "supplier_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    supplier_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False
    )
    reference: Mapped[str] = mapped_column(Text, nullable=False)
    quoted_on: Mapped[str | None] = mapped_column(Text)
    valid_until: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    fx_rate_micro: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1000000")
    )
    declined_at: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    lines: Mapped[list[QuoteLine]] = relationship(
        QuoteLine, order_by=QuoteLine.id, lazy="selectin", cascade="all, delete-orphan"
    )
    files: Mapped[list[QuoteFile]] = relationship(
        QuoteFile, order_by=QuoteFile.id, lazy="selectin", cascade="all, delete-orphan"
    )
