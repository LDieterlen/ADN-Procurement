"""`location`: a room type inside a project (lobby, chambre typo X…) with its zone, level and
multiplier (DATA_MODEL §4.4, ADR-0013)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Location(TimestampedMixin, Base):
    __tablename__ = "location"
    __table_args__ = (
        UniqueConstraint("project_id", "code", name="uq_location_project_id"),
        # Target of the composite foreign keys: no cross-project reference, even by bug.
        UniqueConstraint("id", "project_id", name="uq_location_id"),
        CheckConstraint("length(code) > 0", name="code_not_empty"),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("multiplier >= 1", name="multiplier_min"),
        Index("ix_location_project_id", "project_id", "sort_order"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    zone: Mapped[str | None] = mapped_column(Text)  # « Zones communes », « Hébergement »…
    level: Mapped[str | None] = mapped_column(Text)  # « R0 », « R+1 »…
    multiplier: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    archived_at: Mapped[str | None] = mapped_column(Text)
