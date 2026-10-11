"""bons de commande : purchase_order, purchase_order_line, purchase_order_file, po_sequence (étape 10b, ADR-0007)

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-11

Écrite à la main d'après DATA_MODEL §4.20–4.23. Additive : quatre CREATE TABLE STRICT.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"
PO_STATUSES = "'draft', 'issued', 'acknowledged', 'partially_delivered', 'closed', 'cancelled'"


def upgrade() -> None:
    op.create_table(
        "po_sequence",
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("next_value", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint("year BETWEEN 2000 AND 2999", name=op.f("ck_po_sequence_year_range")),
        sa.CheckConstraint("next_value >= 1", name=op.f("ck_po_sequence_next_value_min")),
        sa.PrimaryKeyConstraint("year", name=op.f("pk_po_sequence")),
        sqlite_strict=True,
    )
    op.create_table(
        "purchase_order",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="draft", nullable=False),
        sa.Column("currency", sa.Text(), nullable=False),
        sa.Column("fx_rate_micro", sa.Integer(), server_default=sa.text("1000000"), nullable=False),
        sa.Column("issued_on", sa.Text(), nullable=True),
        sa.Column("expected_delivery_on", sa.Text(), nullable=True),
        sa.Column("supplier_ref", sa.Text(), nullable=True),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("delivery_contact", sa.Text(), nullable=True),
        sa.Column("payment_terms", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "number GLOB 'PO-[0-9][0-9][0-9][0-9]-*'", name=op.f("ck_purchase_order_number_format")
        ),
        sa.CheckConstraint(
            f"status IN ({PO_STATUSES})", name=op.f("ck_purchase_order_status_enum")
        ),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_purchase_order_currency_iso")),
        sa.CheckConstraint("fx_rate_micro >= 1", name=op.f("ck_purchase_order_fx_rate_min")),
        sa.CheckConstraint(
            "currency <> 'EUR' OR fx_rate_micro = 1000000",
            name=op.f("ck_purchase_order_eur_rate_is_one"),
        ),
        sa.CheckConstraint(
            f"issued_on IS NULL OR issued_on {DATE_GLOB}",
            name=op.f("ck_purchase_order_issued_on_date"),
        ),
        sa.CheckConstraint(
            f"expected_delivery_on IS NULL OR expected_delivery_on {DATE_GLOB}",
            name=op.f("ck_purchase_order_expected_delivery_on_date"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_purchase_order_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_purchase_order_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_purchase_order")),
        sa.UniqueConstraint("number", name="uq_purchase_order_number"),
        sqlite_strict=True,
    )
    op.create_index("ix_purchase_order_project_id", "purchase_order", ["project_id"], unique=False)
    op.create_index(
        "ix_purchase_order_supplier_id", "purchase_order", ["supplier_id"], unique=False
    )

    op.create_table(
        "purchase_order_line",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchase_order_id", sa.Integer(), nullable=False),
        sa.Column("project_item_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("qty_milli", sa.Integer(), nullable=False),
        sa.Column("unit_cost_cents", sa.Integer(), nullable=False),
        sa.Column("discount_bp", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("vat_rate_bp", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "length(description) > 0", name=op.f("ck_purchase_order_line_description_not_empty")
        ),
        sa.CheckConstraint("qty_milli >= 0", name=op.f("ck_purchase_order_line_qty_min")),
        sa.CheckConstraint(
            "unit_cost_cents >= 0", name=op.f("ck_purchase_order_line_unit_cost_min")
        ),
        sa.CheckConstraint(
            "discount_bp BETWEEN 0 AND 10000", name=op.f("ck_purchase_order_line_discount_bp_range")
        ),
        sa.CheckConstraint(
            "vat_rate_bp BETWEEN 0 AND 10000", name=op.f("ck_purchase_order_line_vat_rate_bp_range")
        ),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_order.id"],
            name=op.f("fk_purchase_order_line_purchase_order_id_purchase_order"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_purchase_order_line_project_item_id_project_item",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_purchase_order_line")),
        sa.UniqueConstraint(
            "purchase_order_id", "project_item_id", name="uq_purchase_order_line_purchase_order_id"
        ),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_purchase_order_line_project_item_id",
        "purchase_order_line",
        ["project_item_id"],
        unique=False,
    )

    op.create_table(
        "purchase_order_file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchase_order_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_order.id"],
            name=op.f("fk_purchase_order_file_purchase_order_id_purchase_order"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["file.id"],
            name=op.f("fk_purchase_order_file_file_id_file"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_purchase_order_file")),
        sa.UniqueConstraint(
            "purchase_order_id", "file_id", name="uq_purchase_order_file_purchase_order_id"
        ),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_purchase_order_file_file_id", "purchase_order_file", ["file_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_purchase_order_file_file_id", table_name="purchase_order_file")
    op.drop_table("purchase_order_file")
    op.drop_index("ix_purchase_order_line_project_item_id", table_name="purchase_order_line")
    op.drop_table("purchase_order_line")
    op.drop_index("ix_purchase_order_supplier_id", table_name="purchase_order")
    op.drop_index("ix_purchase_order_project_id", table_name="purchase_order")
    op.drop_table("purchase_order")
    op.drop_table("po_sequence")
