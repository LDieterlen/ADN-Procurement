"""`project_item`: one specification in a project, frozen price, status (DATA_MODEL §4.11, pivot)."""

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin
from ffe.models.product import UNITS_SQL
from ffe.models.project_item_file import ProjectItemFile
from ffe.models.project_item_placement import ProjectItemPlacement

ITEM_KINDS = ("ffe", "ose", "custom", "existing", "fee")
ITEM_KINDS_SQL = ", ".join(f"'{k}'" for k in ITEM_KINDS)
ITEM_STATUSES_SQL = ", ".join(
    f"'{s}'"
    for s in (
        "draft",
        "specified",
        "quoted",
        "approved",
        "ordered",
        "delivered",
        "installed",
        "cancelled",
        "replaced",
    )
)


class ProjectItem(TimestampedMixin, Base):
    __tablename__ = "project_item"
    __table_args__ = (
        UniqueConstraint("project_id", "item_code", name="uq_project_item_project_id"),
        UniqueConstraint("id", "project_id", name="uq_project_item_id"),
        ForeignKeyConstraint(
            ["replaced_by_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_project_item_replaced_by_id_project_item",
            ondelete="RESTRICT",
        ),
        CheckConstraint("length(item_code) > 0", name="item_code_not_empty"),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint(f"kind IN ({ITEM_KINDS_SQL})", name="kind_enum"),
        CheckConstraint(f"unit IN ({UNITS_SQL})", name="unit_enum"),
        CheckConstraint("width_mm IS NULL OR width_mm >= 0", name="width_min"),
        CheckConstraint("depth_mm IS NULL OR depth_mm >= 0", name="depth_min"),
        CheckConstraint("height_mm IS NULL OR height_mm >= 0", name="height_min"),
        CheckConstraint("diameter_mm IS NULL OR diameter_mm >= 0", name="diameter_min"),
        CheckConstraint("unit_cost_cents >= 0", name="unit_cost_min"),
        CheckConstraint("kind <> 'existing' OR unit_cost_cents = 0", name="existing_is_free"),
        CheckConstraint("length(currency) = 3", name="currency_length"),
        CheckConstraint("fx_rate_micro > 0", name="fx_rate_positive"),
        CheckConstraint("currency <> 'EUR' OR fx_rate_micro = 1000000", name="eur_rate_is_one"),
        CheckConstraint("discount_bp BETWEEN 0 AND 10000", name="discount_bp_range"),
        CheckConstraint("vat_rate_bp BETWEEN 0 AND 10000", name="vat_rate_bp_range"),
        CheckConstraint("lead_time_weeks IS NULL OR lead_time_weeks >= 0", name="lead_time_min"),
        CheckConstraint(
            f"required_on_site IS NULL OR required_on_site {DATE_GLOB}",
            name="required_on_site_date",
        ),
        CheckConstraint(f"quoted_on IS NULL OR quoted_on {DATE_GLOB}", name="quoted_on_date"),
        CheckConstraint(
            f"quote_valid_until IS NULL OR quote_valid_until {DATE_GLOB}",
            name="quote_valid_until_date",
        ),
        CheckConstraint(
            "quote_valid_until IS NULL OR quoted_on IS NULL OR quote_valid_until >= quoted_on",
            name="quote_dates_ordered",
        ),
        CheckConstraint(
            f"expected_delivery_on IS NULL OR expected_delivery_on {DATE_GLOB}",
            name="expected_delivery_on_date",
        ),
        CheckConstraint(f"status IN ({ITEM_STATUSES_SQL})", name="status_enum"),
        CheckConstraint("on_hold IN (0, 1)", name="on_hold_bool"),
        CheckConstraint(
            "(status = 'replaced') = (replaced_by_id IS NOT NULL)", name="replaced_has_successor"
        ),
        CheckConstraint("replaced_by_id IS NULL OR replaced_by_id <> id", name="replaced_not_self"),
        CheckConstraint(
            "(approved_at IS NULL) = (approved_unit_net_cents IS NULL)",
            name="approved_snapshot_price",
        ),
        CheckConstraint(
            "(approved_at IS NULL) = (approved_total_qty_milli IS NULL)",
            name="approved_snapshot_qty",
        ),
        CheckConstraint(
            "approved_unit_net_cents IS NULL OR approved_unit_net_cents >= 0",
            name="approved_unit_net_min",
        ),
        CheckConstraint(
            "approved_total_qty_milli IS NULL OR approved_total_qty_milli >= 0",
            name="approved_total_qty_min",
        ),
        Index("ix_project_item_project_id", "project_id", "sort_order"),
        Index("ix_project_item_status", "project_id", "status"),
        Index("ix_project_item_product_id", "product_id"),
        Index("ix_project_item_supplier_id", "supplier_id"),
        Index("ix_project_item_category_id", "category_id"),
        Index("ix_project_item_replaced_by_id", "replaced_by_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    item_code: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT"), nullable=False
    )
    product_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product.id", ondelete="RESTRICT")
    )
    supplier_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    client_description: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="ffe")
    unit: Mapped[str] = mapped_column(Text, nullable=False, server_default="piece")
    finish: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str | None] = mapped_column(Text)
    materials: Mapped[str | None] = mapped_column(Text)
    width_mm: Mapped[int | None] = mapped_column(Integer)
    depth_mm: Mapped[int | None] = mapped_column(Integer)
    height_mm: Mapped[int | None] = mapped_column(Integer)
    diameter_mm: Mapped[int | None] = mapped_column(Integer)
    unit_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    fx_rate_micro: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1000000")
    )
    discount_bp: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    vat_rate_bp: Mapped[int] = mapped_column(Integer, nullable=False)
    lead_time_weeks: Mapped[int | None] = mapped_column(Integer)
    required_on_site: Mapped[str | None] = mapped_column(Text)
    quoted_on: Mapped[str | None] = mapped_column(Text)
    quote_valid_until: Mapped[str | None] = mapped_column(Text)
    expected_delivery_on: Mapped[str | None] = mapped_column(Text)
    quote_ref: Mapped[str | None] = mapped_column(Text)
    order_ref: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="draft")
    on_hold: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    replaced_by_id: Mapped[int | None] = mapped_column(Integer)
    approved_at: Mapped[str | None] = mapped_column(Text)
    approved_unit_net_cents: Mapped[int | None] = mapped_column(Integer)
    approved_total_qty_milli: Mapped[int | None] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    internal_notes: Mapped[str | None] = mapped_column(Text)

    placements: Mapped[list[ProjectItemPlacement]] = relationship(
        ProjectItemPlacement,
        order_by=(ProjectItemPlacement.sort_order, ProjectItemPlacement.id),
        lazy="selectin",
        cascade="all, delete-orphan",
        foreign_keys=[ProjectItemPlacement.project_item_id],
        primaryjoin="ProjectItem.id == ProjectItemPlacement.project_item_id",
    )
    files: Mapped[list[ProjectItemFile]] = relationship(
        ProjectItemFile,
        order_by=(ProjectItemFile.sort_order, ProjectItemFile.id),
        lazy="selectin",
        cascade="all, delete-orphan",
    )
