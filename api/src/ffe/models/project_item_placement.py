"""`project_item_placement`: where a line goes and how many per location (DATA_MODEL §4.12)."""

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, Integer, func, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base
from ffe.models.location import Location


class ProjectItemPlacement(Base):
    __tablename__ = "project_item_placement"
    __table_args__ = (
        # Composite foreign keys: a placement can never cross projects (DATA_MODEL §3).
        ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_project_item_placement_project_item_id_project_item",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["location_id", "project_id"],
            ["location.id", "location.project_id"],
            name="fk_project_item_placement_location_id_location",
            ondelete="RESTRICT",
        ),
        CheckConstraint("qty_milli >= 0", name="qty_min"),
        Index("ix_project_item_placement_project_id", "project_id", "location_id", "sort_order"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, nullable=False)
    location_id: Mapped[int | None] = mapped_column(Integer)  # NULL = « non affecté »
    qty_milli: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1000"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)


# One placement per (line, location), NULL location included (expression index, hand-written).
Index(
    "uq_project_item_placement_location",
    ProjectItemPlacement.project_item_id,
    func.coalesce(ProjectItemPlacement.location_id, 0),
    unique=True,
)

__all__ = ["Location", "ProjectItemPlacement"]
