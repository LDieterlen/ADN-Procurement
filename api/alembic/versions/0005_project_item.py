"""lignes : project_item, project_item_placement, project_item_event, code_sequence, project_item_file (étape 7a)

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-11

Écrite à la main d'après DATA_MODEL §4.11 à §4.15. Additive : cinq CREATE TABLE STRICT, les FK
composites `(x_id, project_id)` vers `zone (id, project_id)` et `project_item (id, project_id)`,
un index d'expression `(project_item_id, COALESCE(zone_id, 0))` et un index partiel (photo principale).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"
UNITS = "'piece', 'pair', 'set', 'lot', 'm', 'm2', 'roll'"
KINDS = "'ffe', 'ose', 'custom', 'existing', 'fee'"
STATUSES = (
    "'draft', 'specified', 'quoted', 'approved', 'ordered', 'delivered', 'installed', "
    "'cancelled', 'replaced'"
)


def _ck(name: str, sql: str) -> sa.CheckConstraint:
    return sa.CheckConstraint(sql, name=op.f(f"ck_project_item_{name}"))


def upgrade() -> None:
    op.create_table(
        "project_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("item_code", sa.Text(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("supplier_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("client_description", sa.Text(), nullable=True),
        sa.Column("kind", sa.Text(), server_default="ffe", nullable=False),
        sa.Column("unit", sa.Text(), server_default="piece", nullable=False),
        sa.Column("finish", sa.Text(), nullable=True),
        sa.Column("color", sa.Text(), nullable=True),
        sa.Column("materials", sa.Text(), nullable=True),
        sa.Column("width_mm", sa.Integer(), nullable=True),
        sa.Column("depth_mm", sa.Integer(), nullable=True),
        sa.Column("height_mm", sa.Integer(), nullable=True),
        sa.Column("diameter_mm", sa.Integer(), nullable=True),
        sa.Column("unit_cost_cents", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column("fx_rate_micro", sa.Integer(), server_default=sa.text("1000000"), nullable=False),
        sa.Column("discount_bp", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("vat_rate_bp", sa.Integer(), nullable=False),
        sa.Column("lead_time_weeks", sa.Integer(), nullable=True),
        sa.Column("required_on_site", sa.Text(), nullable=True),
        sa.Column("quoted_on", sa.Text(), nullable=True),
        sa.Column("quote_valid_until", sa.Text(), nullable=True),
        sa.Column("expected_delivery_on", sa.Text(), nullable=True),
        sa.Column("quote_ref", sa.Text(), nullable=True),
        sa.Column("order_ref", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default="draft", nullable=False),
        sa.Column("on_hold", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("replaced_by_id", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.Text(), nullable=True),
        sa.Column("approved_unit_net_cents", sa.Integer(), nullable=True),
        sa.Column("approved_total_qty_milli", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        _ck("item_code_not_empty", "length(item_code) > 0"),
        _ck("name_not_empty", "length(name) > 0"),
        _ck("kind_enum", f"kind IN ({KINDS})"),
        _ck("unit_enum", f"unit IN ({UNITS})"),
        _ck("width_min", "width_mm IS NULL OR width_mm >= 0"),
        _ck("depth_min", "depth_mm IS NULL OR depth_mm >= 0"),
        _ck("height_min", "height_mm IS NULL OR height_mm >= 0"),
        _ck("diameter_min", "diameter_mm IS NULL OR diameter_mm >= 0"),
        _ck("unit_cost_min", "unit_cost_cents >= 0"),
        _ck("existing_is_free", "kind <> 'existing' OR unit_cost_cents = 0"),
        _ck("currency_length", "length(currency) = 3"),
        _ck("fx_rate_positive", "fx_rate_micro > 0"),
        _ck("eur_rate_is_one", "currency <> 'EUR' OR fx_rate_micro = 1000000"),
        _ck("discount_bp_range", "discount_bp BETWEEN 0 AND 10000"),
        _ck("vat_rate_bp_range", "vat_rate_bp BETWEEN 0 AND 10000"),
        _ck("lead_time_min", "lead_time_weeks IS NULL OR lead_time_weeks >= 0"),
        _ck("required_on_site_date", f"required_on_site IS NULL OR required_on_site {DATE_GLOB}"),
        _ck("quoted_on_date", f"quoted_on IS NULL OR quoted_on {DATE_GLOB}"),
        _ck(
            "quote_valid_until_date", f"quote_valid_until IS NULL OR quote_valid_until {DATE_GLOB}"
        ),
        _ck(
            "quote_dates_ordered",
            "quote_valid_until IS NULL OR quoted_on IS NULL OR quote_valid_until >= quoted_on",
        ),
        _ck(
            "expected_delivery_on_date",
            f"expected_delivery_on IS NULL OR expected_delivery_on {DATE_GLOB}",
        ),
        _ck("status_enum", f"status IN ({STATUSES})"),
        _ck("on_hold_bool", "on_hold IN (0, 1)"),
        _ck("replaced_has_successor", "(status = 'replaced') = (replaced_by_id IS NOT NULL)"),
        _ck("replaced_not_self", "replaced_by_id IS NULL OR replaced_by_id <> id"),
        _ck("approved_snapshot_price", "(approved_at IS NULL) = (approved_unit_net_cents IS NULL)"),
        _ck("approved_snapshot_qty", "(approved_at IS NULL) = (approved_total_qty_milli IS NULL)"),
        _ck(
            "approved_unit_net_min",
            "approved_unit_net_cents IS NULL OR approved_unit_net_cents >= 0",
        ),
        _ck(
            "approved_total_qty_min",
            "approved_total_qty_milli IS NULL OR approved_total_qty_milli >= 0",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_project_item_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            name=op.f("fk_project_item_category_id_category"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            name=op.f("fk_project_item_product_id_product"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_project_item_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["replaced_by_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_project_item_replaced_by_id_project_item",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_item")),
        sa.UniqueConstraint("project_id", "item_code", name="uq_project_item_project_id"),
        sa.UniqueConstraint("id", "project_id", name="uq_project_item_id"),
        sqlite_strict=True,
    )
    for name, columns in (
        ("ix_project_item_project_id", ["project_id", "sort_order"]),
        ("ix_project_item_status", ["project_id", "status"]),
        ("ix_project_item_product_id", ["product_id"]),
        ("ix_project_item_supplier_id", ["supplier_id"]),
        ("ix_project_item_category_id", ["category_id"]),
        ("ix_project_item_replaced_by_id", ["replaced_by_id"]),
    ):
        op.create_index(name, "project_item", columns, unique=False)

    op.create_table(
        "project_item_placement",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_item_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("zone_id", sa.Integer(), nullable=True),
        sa.Column("qty_milli", sa.Integer(), server_default=sa.text("1000"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("qty_milli >= 0", name=op.f("ck_project_item_placement_qty_min")),
        sa.ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_project_item_placement_project_item_id_project_item",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["zone_id", "project_id"],
            ["zone.id", "zone.project_id"],
            name="fk_project_item_placement_zone_id_zone",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_item_placement")),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_project_item_placement_project_id",
        "project_item_placement",
        ["project_id", "zone_id", "sort_order"],
        unique=False,
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_project_item_placement_zone "
        "ON project_item_placement (project_item_id, COALESCE(zone_id, 0))"
    )

    op.create_table(
        "project_item_event",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_item_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("from_status", sa.Text(), nullable=True),
        sa.Column("to_status", sa.Text(), nullable=True),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("changed_at", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_item_id"],
            ["project_item.id"],
            name=op.f("fk_project_item_event_project_item_id_project_item"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_item_event")),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_project_item_event_project_item_id",
        "project_item_event",
        ["project_item_id", "changed_at"],
        unique=False,
    )

    op.create_table(
        "code_sequence",
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("prefix", sa.Text(), nullable=False),
        sa.Column("next_value", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint(
            "length(prefix) BETWEEN 2 AND 4", name=op.f("ck_code_sequence_prefix_length")
        ),
        sa.CheckConstraint("next_value >= 1", name=op.f("ck_code_sequence_next_value_min")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_code_sequence_project_id_project"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("project_id", "prefix", name=op.f("pk_code_sequence")),
        sqlite_strict=True,
    )

    op.create_table(
        "project_item_file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_item_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), server_default="other", nullable=False),
        sa.Column("is_primary", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('image', 'quote', 'approval', 'drawing', 'other')",
            name=op.f("ck_project_item_file_kind_enum"),
        ),
        sa.CheckConstraint(
            "is_primary IN (0, 1)", name=op.f("ck_project_item_file_is_primary_bool")
        ),
        sa.CheckConstraint(
            "is_primary = 0 OR kind = 'image'", name=op.f("ck_project_item_file_primary_is_image")
        ),
        sa.ForeignKeyConstraint(
            ["project_item_id"],
            ["project_item.id"],
            name=op.f("fk_project_item_file_project_item_id_project_item"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["file.id"],
            name=op.f("fk_project_item_file_file_id_file"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_item_file")),
        sa.UniqueConstraint(
            "project_item_id", "file_id", name="uq_project_item_file_project_item_id"
        ),
        sqlite_strict=True,
    )
    op.create_index("ix_project_item_file_file_id", "project_item_file", ["file_id"], unique=False)
    op.execute(
        "CREATE UNIQUE INDEX uq_project_item_file_primary ON project_item_file (project_item_id) "
        "WHERE is_primary = 1"
    )


def downgrade() -> None:
    op.execute("DROP INDEX uq_project_item_file_primary")
    op.drop_index("ix_project_item_file_file_id", table_name="project_item_file")
    op.drop_table("project_item_file")
    op.drop_table("code_sequence")
    op.drop_index("ix_project_item_event_project_item_id", table_name="project_item_event")
    op.drop_table("project_item_event")
    op.execute("DROP INDEX uq_project_item_placement_zone")
    op.drop_index("ix_project_item_placement_project_id", table_name="project_item_placement")
    op.drop_table("project_item_placement")
    for name in (
        "ix_project_item_replaced_by_id",
        "ix_project_item_category_id",
        "ix_project_item_supplier_id",
        "ix_project_item_product_id",
        "ix_project_item_status",
        "ix_project_item_project_id",
    ):
        op.drop_index(name, table_name="project_item")
    op.drop_table("project_item")
