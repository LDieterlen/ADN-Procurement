"""`installation_sheet`: one part of a room (« Coin TV » of the « Salon ») shown on A3 pages, its
plan in the middle and its articles around (ADR-0024, migration 0008); `installation_sheet_item`:
the placements shown, each in its cell (empty cells allowed)."""

from __future__ import annotations

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class InstallationSheet(TimestampedMixin, Base):
    __tablename__ = "installation_sheet"
    __table_args__ = (
        ForeignKeyConstraint(
            ["location_id", "project_id"],
            ["location.id", "location.project_id"],
            name="fk_installation_sheet_location_id_location",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["plan_id", "project_id"],
            ["installation_plan.id", "installation_plan.project_id"],
            name="fk_installation_sheet_plan_id_installation_plan",
            ondelete="RESTRICT",
        ),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("per_page IN (8, 12, 16)", name="per_page_valid"),
        CheckConstraint(
            "arrangement IN ('ring', 'sides', 'ends', 'right')", name="arrangement_valid"
        ),
        CheckConstraint("plan_rotation IN (0, 90, 180, 270)", name="plan_rotation_valid"),
        CheckConstraint("color_by_type IN (0, 1)", name="color_by_type_bool"),
        Index("ix_installation_sheet_project_id", "project_id", "location_id", "sort_order"),
        Index("ix_installation_sheet_plan_id", "plan_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    location_id: Mapped[int] = mapped_column(Integer, nullable=False)  # the room
    plan_id: Mapped[int | None] = mapped_column(Integer)  # NULL = no plan chosen yet
    name: Mapped[str] = mapped_column(Text, nullable=False)  # « Coin TV »
    per_page: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    # Where the articles go (`ffe.installation.ARRANGEMENTS`): round the plan, left and right,
    # above and below, or right of it.
    arrangement: Mapped[str] = mapped_column(Text, nullable=False, default="ring")
    plan_rotation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # clockwise
    # Markers and cards in the colour of their product type (`ffe.installation.TYPE_COLORS`).
    color_by_type: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    items: Mapped[list[InstallationSheetItem]] = relationship(
        order_by="InstallationSheetItem.position",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class InstallationSheetItem(Base):
    __tablename__ = "installation_sheet_item"
    __table_args__ = (
        UniqueConstraint("sheet_id", "placement_id", name="uq_installation_sheet_item_placement"),
        CheckConstraint("position >= 0", name="position_min"),
        Index("ix_installation_sheet_item_placement_id", "placement_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sheet_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("installation_sheet.id", ondelete="CASCADE"), nullable=False
    )
    # A placement removed from its article leaves the sheets with it.
    placement_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project_item_placement.id", ondelete="CASCADE"), nullable=False
    )
    # The cell it fills, counted over the pages (page = position // per_page); a missing position
    # is a cell left empty on purpose, to put an article in front of its spot on the plan.
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    markers: Mapped[list[InstallationSheetMarker]] = relationship(
        order_by="InstallationSheetMarker.id", cascade="all, delete-orphan", lazy="selectin"
    )


class InstallationSheetMarker(Base):
    """Where an article goes on the plan: a numbered dot (its cell number on the page), one per
    spot (four chairs, four dots). In thousandths of the plan as stored, before any rotation, so
    a dot stays put whatever the arrangement, the page size or the plan's orientation."""

    __tablename__ = "installation_sheet_marker"
    __table_args__ = (
        CheckConstraint("x_permille BETWEEN 0 AND 1000", name="x_range"),
        CheckConstraint("y_permille BETWEEN 0 AND 1000", name="y_range"),
        Index("ix_installation_sheet_marker_sheet_item_id", "sheet_item_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sheet_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("installation_sheet_item.id", ondelete="CASCADE"), nullable=False
    )
    x_permille: Mapped[int] = mapped_column(Integer, nullable=False)
    y_permille: Mapped[int] = mapped_column(Integer, nullable=False)
