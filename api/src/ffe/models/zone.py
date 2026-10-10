"""`zone`: a destination inside a project, with its multiplier (DATA_MODEL §4.4)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Zone(TimestampedMixin, Base):
    __tablename__ = "zone"
    __table_args__ = (
        UniqueConstraint("project_id", "code", name="uq_zone_project_id"),
        # Target of the composite foreign keys of step 7a: no cross-project reference, even by bug.
        UniqueConstraint("id", "project_id", name="uq_zone_id"),
        CheckConstraint("length(code) > 0", name="code_not_empty"),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("multiplier >= 1", name="multiplier_min"),
        Index("ix_zone_project_id", "project_id", "sort_order"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str | None] = mapped_column(Text)
    multiplier: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)
