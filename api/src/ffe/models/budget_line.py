"""`budget_line`: forecast envelope in net HT EUR — global, or per location, zone, family or supplier
(DATA_MODEL §4.16, ADR-0013)."""

from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class BudgetLine(TimestampedMixin, Base):
    __tablename__ = "budget_line"
    __table_args__ = (
        ForeignKeyConstraint(
            ["location_id", "project_id"],
            ["location.id", "location.project_id"],
            name="fk_budget_line_location_id_location",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "scope IN ('global', 'location', 'zone', 'family', 'supplier')", name="scope_enum"
        ),
        # Exactly the reference of the scope is set, nothing else.
        CheckConstraint("(scope = 'location') = (location_id IS NOT NULL)", name="scope_location"),
        CheckConstraint("(scope = 'zone') = (zone IS NOT NULL)", name="scope_zone"),
        CheckConstraint("(scope = 'family') = (family IS NOT NULL)", name="scope_family"),
        CheckConstraint("(scope = 'supplier') = (supplier_id IS NOT NULL)", name="scope_supplier"),
        CheckConstraint("amount_cents >= 0", name="amount_min"),
        Index("ix_budget_line_project_id", "project_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    location_id: Mapped[int | None] = mapped_column(Integer)
    zone: Mapped[str | None] = mapped_column(Text)
    family: Mapped[str | None] = mapped_column(Text)
    supplier_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT")
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


# One envelope per scope and reference (expression index, hand-written in the migration too).
Index(
    "uq_budget_line_scope",
    BudgetLine.project_id,
    BudgetLine.scope,
    func.coalesce(BudgetLine.location_id, 0),
    func.coalesce(BudgetLine.zone, ""),
    func.coalesce(BudgetLine.family, ""),
    func.coalesce(BudgetLine.supplier_id, 0),
    unique=True,
)
