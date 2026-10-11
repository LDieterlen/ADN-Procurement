"""`quote_line`: one quoted price per project item of the same project (DATA_MODEL §4.18)."""

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


class QuoteLine(TimestampedMixin, Base):
    __tablename__ = "quote_line"
    __table_args__ = (
        UniqueConstraint("quote_id", "project_item_id", name="uq_quote_line_quote_id"),
        ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_quote_line_project_item_id_project_item",
            ondelete="RESTRICT",
        ),
        CheckConstraint("unit_cost_cents >= 0", name="unit_cost_min"),
        CheckConstraint("discount_bp BETWEEN 0 AND 10000", name="discount_bp_range"),
        CheckConstraint("lead_time_weeks IS NULL OR lead_time_weeks >= 0", name="lead_time_min"),
        Index("ix_quote_line_project_item_id", "project_item_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quote_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quote.id", ondelete="CASCADE"), nullable=False
    )
    project_item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_bp: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    lead_time_weeks: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    retained_at: Mapped[str | None] = mapped_column(Text)


Index(
    "uq_quote_line_retained",
    QuoteLine.project_item_id,
    unique=True,
    sqlite_where=QuoteLine.retained_at.isnot(None),
)
