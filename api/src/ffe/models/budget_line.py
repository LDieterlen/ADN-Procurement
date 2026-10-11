"""`budget_line`: target envelope in net HT EUR per project, zone, category or zone × category (DATA_MODEL §4.16)."""

from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class BudgetLine(TimestampedMixin, Base):
    __tablename__ = "budget_line"
    __table_args__ = (
        ForeignKeyConstraint(
            ["zone_id", "project_id"],
            ["zone.id", "zone.project_id"],
            name="fk_budget_line_zone_id_zone",
            ondelete="RESTRICT",
        ),
        CheckConstraint("amount_cents >= 0", name="amount_min"),
        Index("ix_budget_line_project_id", "project_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    zone_id: Mapped[int | None] = mapped_column(Integer)
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT")
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


# One envelope per (project, zone or none, category or none): two global budgets are impossible.
Index(
    "uq_budget_line_scope",
    BudgetLine.project_id,
    func.coalesce(BudgetLine.zone_id, 0),
    func.coalesce(BudgetLine.category_id, 0),
    unique=True,
)
