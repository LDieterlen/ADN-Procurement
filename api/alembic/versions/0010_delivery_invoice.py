"""réceptions et factures : delivery, delivery_line, supplier_invoice (étape 10c, ADR-0008)

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-11

Écrite à la main d'après DATA_MODEL §4.24–4.26. Additive : trois CREATE TABLE STRICT.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"


def upgrade() -> None:
    op.create_table(
        "delivery",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchase_order_id", sa.Integer(), nullable=False),
        sa.Column("received_on", sa.Text(), nullable=False),
        sa.Column("reference", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(f"received_on {DATE_GLOB}", name=op.f("ck_delivery_received_on_date")),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_order.id"],
            name=op.f("fk_delivery_purchase_order_id_purchase_order"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_delivery")),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_delivery_purchase_order_id", "delivery", ["purchase_order_id"], unique=False
    )

    op.create_table(
        "delivery_line",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("delivery_id", sa.Integer(), nullable=False),
        sa.Column("purchase_order_line_id", sa.Integer(), nullable=False),
        sa.Column("qty_milli", sa.Integer(), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("qty_milli > 0", name=op.f("ck_delivery_line_qty_positive")),
        sa.ForeignKeyConstraint(
            ["delivery_id"],
            ["delivery.id"],
            name=op.f("fk_delivery_line_delivery_id_delivery"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["purchase_order_line_id"],
            ["purchase_order_line.id"],
            name=op.f("fk_delivery_line_purchase_order_line_id_purchase_order_line"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_delivery_line")),
        sa.UniqueConstraint(
            "delivery_id", "purchase_order_line_id", name="uq_delivery_line_delivery_id"
        ),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_delivery_line_purchase_order_line_id",
        "delivery_line",
        ["purchase_order_line_id"],
        unique=False,
    )

    op.create_table(
        "supplier_invoice",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchase_order_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), server_default="balance", nullable=False),
        sa.Column("reference", sa.Text(), nullable=False),
        sa.Column("invoiced_on", sa.Text(), nullable=False),
        sa.Column("due_on", sa.Text(), nullable=True),
        sa.Column("amount_ht_cents", sa.Integer(), nullable=False),
        sa.Column("vat_cents", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("paid_on", sa.Text(), nullable=True),
        sa.Column("payment_ref", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('deposit', 'balance', 'other')", name=op.f("ck_supplier_invoice_kind_enum")
        ),
        sa.CheckConstraint(
            "length(reference) > 0", name=op.f("ck_supplier_invoice_reference_not_empty")
        ),
        sa.CheckConstraint(
            f"invoiced_on {DATE_GLOB}", name=op.f("ck_supplier_invoice_invoiced_on_date")
        ),
        sa.CheckConstraint(
            f"due_on IS NULL OR due_on {DATE_GLOB}", name=op.f("ck_supplier_invoice_due_on_date")
        ),
        sa.CheckConstraint(
            f"paid_on IS NULL OR paid_on {DATE_GLOB}", name=op.f("ck_supplier_invoice_paid_on_date")
        ),
        sa.CheckConstraint("amount_ht_cents >= 0", name=op.f("ck_supplier_invoice_amount_ht_min")),
        sa.CheckConstraint("vat_cents >= 0", name=op.f("ck_supplier_invoice_vat_min")),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_order.id"],
            name=op.f("fk_supplier_invoice_purchase_order_id_purchase_order"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_supplier_invoice")),
        sa.UniqueConstraint(
            "purchase_order_id", "reference", name="uq_supplier_invoice_purchase_order_id"
        ),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_supplier_invoice_purchase_order_id",
        "supplier_invoice",
        ["purchase_order_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_supplier_invoice_purchase_order_id", table_name="supplier_invoice")
    op.drop_table("supplier_invoice")
    op.drop_index("ix_delivery_line_purchase_order_line_id", table_name="delivery_line")
    op.drop_table("delivery_line")
    op.drop_index("ix_delivery_purchase_order_id", table_name="delivery")
    op.drop_table("delivery")
