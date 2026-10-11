"""import de tarifs : import_batch, price_observation, supplier.import_mapping (étape F4, ADR-0011)

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-11

Additive : deux CREATE TABLE STRICT, un ADD COLUMN nullable.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"


def upgrade() -> None:
    op.execute("ALTER TABLE supplier ADD COLUMN import_mapping TEXT")
    op.create_table(
        "import_batch",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("mapping_json", sa.Text(), nullable=False),
        sa.Column("imported_at", sa.Text(), nullable=False),
        sa.Column("rows_total", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("rows_created", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("rows_updated", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("rows_unchanged", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("rows_skipped", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("rows_discontinued", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint(
            "rows_total >= 0 AND rows_created >= 0 AND rows_updated >= 0 AND rows_unchanged >= 0 "
            "AND rows_skipped >= 0 AND rows_discontinued >= 0",
            name=op.f("ck_import_batch_counts_min"),
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_import_batch_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"], ["file.id"], name=op.f("fk_import_batch_file_id_file"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_import_batch")),
        sqlite_strict=True,
    )
    op.create_index("ix_import_batch_supplier_id", "import_batch", ["supplier_id"], unique=False)
    op.create_table(
        "price_observation",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("import_batch_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("list_price_cents", sa.Integer(), nullable=False),
        sa.Column("list_price_currency", sa.Text(), nullable=False),
        sa.Column("list_price_tax_mode", sa.Text(), nullable=False),
        sa.Column("observed_on", sa.Text(), nullable=False),
        sa.CheckConstraint("list_price_cents >= 0", name=op.f("ck_price_observation_price_min")),
        sa.CheckConstraint(
            "length(list_price_currency) = 3", name=op.f("ck_price_observation_currency_iso")
        ),
        sa.CheckConstraint(
            "list_price_tax_mode IN ('ht', 'ttc')", name=op.f("ck_price_observation_tax_mode_enum")
        ),
        sa.CheckConstraint(
            f"observed_on {DATE_GLOB}", name=op.f("ck_price_observation_observed_on_date")
        ),
        sa.ForeignKeyConstraint(
            ["import_batch_id"],
            ["import_batch.id"],
            name=op.f("fk_price_observation_import_batch_id_import_batch"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            name=op.f("fk_price_observation_product_id_product"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_price_observation")),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_price_observation_product_id", "price_observation", ["product_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_price_observation_product_id", table_name="price_observation")
    op.drop_table("price_observation")
    op.drop_index("ix_import_batch_supplier_id", table_name="import_batch")
    op.drop_table("import_batch")
    op.execute("ALTER TABLE supplier DROP COLUMN import_mapping")
