"""devis : quote, quote_line, quote_file (étape 10a, ADR-0006)

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-11

Écrite à la main d'après DATA_MODEL §4.17–4.19. Additive : trois CREATE TABLE STRICT, FK composite
`(project_item_id, project_id)` vers `project_item (id, project_id)` (même projet garanti), index
unique partiel « au plus une ligne de devis retenue par article ».
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"


def upgrade() -> None:
    op.create_table(
        "quote",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.Text(), nullable=False),
        sa.Column("quoted_on", sa.Text(), nullable=True),
        sa.Column("valid_until", sa.Text(), nullable=True),
        sa.Column("currency", sa.Text(), nullable=False),
        sa.Column("fx_rate_micro", sa.Integer(), server_default=sa.text("1000000"), nullable=False),
        sa.Column("declined_at", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(reference) > 0", name=op.f("ck_quote_reference_not_empty")),
        sa.CheckConstraint(
            f"quoted_on IS NULL OR quoted_on {DATE_GLOB}", name=op.f("ck_quote_quoted_on_date")
        ),
        sa.CheckConstraint(
            f"valid_until IS NULL OR valid_until {DATE_GLOB}",
            name=op.f("ck_quote_valid_until_date"),
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR quoted_on IS NULL OR valid_until >= quoted_on",
            name=op.f("ck_quote_valid_after_quoted"),
        ),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_quote_currency_iso")),
        sa.CheckConstraint("fx_rate_micro >= 1", name=op.f("ck_quote_fx_rate_min")),
        sa.CheckConstraint(
            "currency <> 'EUR' OR fx_rate_micro = 1000000", name=op.f("ck_quote_eur_rate_is_one")
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_quote_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_quote_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quote")),
        sa.UniqueConstraint("project_id", "supplier_id", "reference", name="uq_quote_project_id"),
        sqlite_strict=True,
    )
    op.create_index("ix_quote_supplier_id", "quote", ["supplier_id"], unique=False)

    op.create_table(
        "quote_line",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quote_id", sa.Integer(), nullable=False),
        sa.Column("project_item_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("unit_cost_cents", sa.Integer(), nullable=False),
        sa.Column("discount_bp", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("lead_time_weeks", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("retained_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("unit_cost_cents >= 0", name=op.f("ck_quote_line_unit_cost_min")),
        sa.CheckConstraint(
            "discount_bp BETWEEN 0 AND 10000", name=op.f("ck_quote_line_discount_bp_range")
        ),
        sa.CheckConstraint(
            "lead_time_weeks IS NULL OR lead_time_weeks >= 0",
            name=op.f("ck_quote_line_lead_time_min"),
        ),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quote.id"],
            name=op.f("fk_quote_line_quote_id_quote"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_quote_line_project_item_id_project_item",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quote_line")),
        sa.UniqueConstraint("quote_id", "project_item_id", name="uq_quote_line_quote_id"),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_quote_line_project_item_id", "quote_line", ["project_item_id"], unique=False
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_quote_line_retained ON quote_line (project_item_id) "
        "WHERE retained_at IS NOT NULL"
    )

    op.create_table(
        "quote_file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quote_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quote.id"],
            name=op.f("fk_quote_file_quote_id_quote"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"], ["file.id"], name=op.f("fk_quote_file_file_id_file"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quote_file")),
        sa.UniqueConstraint("quote_id", "file_id", name="uq_quote_file_quote_id"),
        sqlite_strict=True,
    )
    op.create_index("ix_quote_file_file_id", "quote_file", ["file_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_quote_file_file_id", table_name="quote_file")
    op.drop_table("quote_file")
    op.execute("DROP INDEX uq_quote_line_retained")
    op.drop_index("ix_quote_line_project_item_id", table_name="quote_line")
    op.drop_table("quote_line")
    op.drop_index("ix_quote_supplier_id", table_name="quote")
    op.drop_table("quote")
