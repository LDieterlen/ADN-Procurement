"""`project_item`: one article of a project — its own spec sheet, frozen price, single status
(DATA_MODEL §4.11, pivot ; ADR-0013). Its FF&E codes are on its placements (ADR-0018); an option
is an article attached to a base article, with a letter and the base's placements (ADR-0021)."""

from __future__ import annotations

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin
from ffe.models.project_item_file import ProjectItemFile
from ffe.models.project_item_placement import ProjectItemPlacement

ITEM_KINDS = ("product", "fee")
ITEM_STATUSES = ("to_quote", "quoted", "to_review", "approved", "deposit", "purchased", "cancelled")


def _sql_list(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{v}'" for v in values)


class ProjectItem(TimestampedMixin, Base):
    __tablename__ = "project_item"
    __table_args__ = (
        UniqueConstraint("id", "project_id", name="uq_project_item_id"),
        CheckConstraint("length(item_code) > 0", name="item_code_not_empty"),
        # Codes live on placements (ADR-0018); only a fee line carries its own `FR-NN`.
        CheckConstraint("(kind = 'fee') = (item_code IS NOT NULL)", name="fee_code_only"),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint(f"kind IN ({_sql_list(ITEM_KINDS)})", name="kind_enum"),
        # A fee line has no type; an article always has one.
        CheckConstraint("(kind = 'fee') = (category_id IS NULL)", name="fee_has_no_type"),
        CheckConstraint("unit_cost_cents >= 0", name="unit_cost_min"),
        CheckConstraint("length(currency) = 3", name="currency_length"),
        CheckConstraint("fx_rate_micro > 0", name="fx_rate_positive"),
        CheckConstraint("currency <> 'EUR' OR fx_rate_micro = 1000000", name="eur_rate_is_one"),
        CheckConstraint("discount_bp BETWEEN 0 AND 10000", name="discount_bp_range"),
        CheckConstraint(f"status IN ({_sql_list(ITEM_STATUSES)})", name="status_enum"),
        # Option (ADR-0021): a base and a letter together, or neither.
        CheckConstraint("option_letter GLOB '[A-Z]'", name="option_letter_format"),
        CheckConstraint("(option_of_id IS NULL) = (option_letter IS NULL)", name="option_pair"),
        Index(
            "uq_project_item_option",
            "option_of_id",
            "option_letter",
            unique=True,
            sqlite_where=text("option_of_id IS NOT NULL"),
        ),
        Index(
            "uq_project_item_code",
            "project_id",
            "item_code",
            unique=True,
            sqlite_where=text("item_code IS NOT NULL"),
        ),
        Index("ix_project_item_project_id", "project_id", "sort_order"),
        Index("ix_project_item_status", "project_id", "status"),
        Index("ix_project_item_supplier_id", "supplier_id"),
        Index("ix_project_item_category_id", "category_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    item_code: Mapped[str | None] = mapped_column(Text)  # fees only: `FR-NN` (ADR-0018)
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="product")
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT")
    )
    supplier_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("supplier.id", ondelete="RESTRICT")
    )
    # --- the spec sheet (ADR-0013 ; free text, ADR-0016 : no catalogue) ---
    product_name: Mapped[str] = mapped_column(Text, nullable=False)  # « Nom », as on the page
    name: Mapped[str] = mapped_column(Text, nullable=False)  # « Désignation », short ; = the name
    reference: Mapped[str | None] = mapped_column(Text)
    family: Mapped[str | None] = mapped_column(Text)
    usage: Mapped[str | None] = mapped_column(Text)
    finish: Mapped[str | None] = mapped_column(Text)
    dimensions: Mapped[str | None] = mapped_column(Text)
    lead_time: Mapped[str | None] = mapped_column(Text)  # « 6 à 8 semaines », free text
    source_url: Mapped[str | None] = mapped_column(Text)
    comments: Mapped[str | None] = mapped_column(Text)
    # --- budget ---
    unit_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    fx_rate_micro: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1000000")
    )
    discount_bp: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    quote_ref: Mapped[str | None] = mapped_column(Text)
    quote_indice: Mapped[str | None] = mapped_column(Text)
    quote_url: Mapped[str | None] = mapped_column(Text)
    # --- state ---
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="to_quote")
    # Revision letter of the spec-sheet PDF in which the line last changed (ADR-0012).
    indice: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    # --- option (ADR-0021, migration 0003) ---
    # ON DELETE RESTRICT is in migration 0003; not declared here because SQLite does not reflect the
    # options of a column-level foreign key (added by ADD COLUMN), and `alembic check` would differ.
    option_of_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("project_item.id"))
    option_letter: Mapped[str | None] = mapped_column(Text)

    option_of: Mapped[ProjectItem | None] = relationship(
        "ProjectItem", remote_side=[id], foreign_keys=[option_of_id], lazy="selectin"
    )
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
