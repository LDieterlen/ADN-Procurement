"""produits et fichiers : file, product, product_file (étape 6b)

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-10

Écrite à la main d'après DATA_MODEL §4.8, §4.9, §4.10. Additive : trois CREATE TABLE STRICT, leurs
index, un index unique partiel (une seule photo principale par produit) écrit en SQL.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"


def upgrade() -> None:
    op.create_table(
        "file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.Text(), nullable=False),
        sa.Column("ext", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("original_name", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(sha256) = 64", name=op.f("ck_file_sha256_length")),
        sa.CheckConstraint("length(ext) BETWEEN 1 AND 10", name=op.f("ck_file_ext_length")),
        sa.CheckConstraint("size_bytes >= 0", name=op.f("ck_file_size_bytes_min")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_file")),
        sa.UniqueConstraint("sha256", name=op.f("uq_file_sha256")),
        sqlite_strict=True,
    )

    op.create_table(
        "product",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("manufacturer_id", sa.Integer(), nullable=True),
        sa.Column("manufacturer_ref", sa.Text(), nullable=True),
        sa.Column("gtin", sa.Text(), nullable=True),
        sa.Column("supplier_id", sa.Integer(), nullable=True),
        sa.Column("supplier_ref", sa.Text(), nullable=True),
        sa.Column("unit", sa.Text(), server_default="piece", nullable=False),
        sa.Column("list_price_cents", sa.Integer(), nullable=True),
        sa.Column("list_price_currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column("list_price_tax_mode", sa.Text(), server_default="ht", nullable=False),
        sa.Column("list_price_vat_bp", sa.Integer(), nullable=True),
        sa.Column("list_price_on", sa.Text(), nullable=True),
        sa.Column("lead_time_weeks", sa.Integer(), nullable=True),
        sa.Column("width_mm", sa.Integer(), nullable=True),
        sa.Column("depth_mm", sa.Integer(), nullable=True),
        sa.Column("height_mm", sa.Integer(), nullable=True),
        sa.Column("diameter_mm", sa.Integer(), nullable=True),
        sa.Column("materials", sa.Text(), nullable=True),
        sa.Column("finish", sa.Text(), nullable=True),
        sa.Column("color", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_kind", sa.Text(), server_default="manual", nullable=False),
        sa.Column("discontinued_on", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_product_name_not_empty")),
        sa.CheckConstraint(
            "gtin IS NULL OR gtin NOT GLOB '*[^0-9]*'", name=op.f("ck_product_gtin_digits")
        ),
        sa.CheckConstraint(
            "unit IN ('piece', 'pair', 'set', 'lot', 'm', 'm2', 'roll')",
            name=op.f("ck_product_unit_enum"),
        ),
        sa.CheckConstraint(
            "list_price_cents IS NULL OR list_price_cents >= 0",
            name=op.f("ck_product_list_price_min"),
        ),
        sa.CheckConstraint(
            "length(list_price_currency) = 3", name=op.f("ck_product_list_price_currency_length")
        ),
        sa.CheckConstraint(
            "list_price_tax_mode IN ('ht', 'ttc')", name=op.f("ck_product_list_price_tax_mode_enum")
        ),
        sa.CheckConstraint(
            "list_price_vat_bp IS NULL OR list_price_vat_bp BETWEEN 0 AND 10000",
            name=op.f("ck_product_list_price_vat_bp_range"),
        ),
        sa.CheckConstraint(
            "list_price_tax_mode = 'ht' OR list_price_vat_bp IS NOT NULL",
            name=op.f("ck_product_list_price_ttc_needs_vat"),
        ),
        sa.CheckConstraint(
            f"list_price_on IS NULL OR list_price_on {DATE_GLOB}",
            name=op.f("ck_product_list_price_on_date"),
        ),
        sa.CheckConstraint(
            "lead_time_weeks IS NULL OR lead_time_weeks >= 0", name=op.f("ck_product_lead_time_min")
        ),
        sa.CheckConstraint("width_mm IS NULL OR width_mm >= 0", name=op.f("ck_product_width_min")),
        sa.CheckConstraint("depth_mm IS NULL OR depth_mm >= 0", name=op.f("ck_product_depth_min")),
        sa.CheckConstraint(
            "height_mm IS NULL OR height_mm >= 0", name=op.f("ck_product_height_min")
        ),
        sa.CheckConstraint(
            "diameter_mm IS NULL OR diameter_mm >= 0", name=op.f("ck_product_diameter_min")
        ),
        sa.CheckConstraint(
            f"discontinued_on IS NULL OR discontinued_on {DATE_GLOB}",
            name=op.f("ck_product_discontinued_on_date"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            name=op.f("fk_product_category_id_category"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["manufacturer_id"],
            ["manufacturer.id"],
            name=op.f("fk_product_manufacturer_id_manufacturer"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_product_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product")),
        sqlite_strict=True,
    )
    op.create_index("ix_product_category_id", "product", ["category_id"], unique=False)
    op.create_index(
        "ix_product_manufacturer_id",
        "product",
        ["manufacturer_id", "manufacturer_ref"],
        unique=False,
    )
    op.create_index("ix_product_supplier_id", "product", ["supplier_id"], unique=False)
    op.create_index("ix_product_archived_at", "product", ["archived_at", "name"], unique=False)
    op.create_index("ix_product_gtin", "product", ["gtin"], unique=False)

    op.create_table(
        "product_file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), server_default="image", nullable=False),
        sa.Column("is_primary", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('image', 'datasheet', 'drawing', 'other')",
            name=op.f("ck_product_file_kind_enum"),
        ),
        sa.CheckConstraint("is_primary IN (0, 1)", name=op.f("ck_product_file_is_primary_bool")),
        sa.CheckConstraint(
            "is_primary = 0 OR kind = 'image'", name=op.f("ck_product_file_primary_is_image")
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            name=op.f("fk_product_file_product_id_product"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"], ["file.id"], name=op.f("fk_product_file_file_id_file"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_file")),
        sa.UniqueConstraint("product_id", "file_id", name="uq_product_file_product_id"),
        sqlite_strict=True,
    )
    op.create_index("ix_product_file_file_id", "product_file", ["file_id"], unique=False)
    op.execute(
        "CREATE UNIQUE INDEX uq_product_file_primary ON product_file (product_id) WHERE is_primary = 1"
    )


def downgrade() -> None:
    op.execute("DROP INDEX uq_product_file_primary")
    op.drop_index("ix_product_file_file_id", table_name="product_file")
    op.drop_table("product_file")
    for name in (
        "ix_product_gtin",
        "ix_product_archived_at",
        "ix_product_supplier_id",
        "ix_product_manufacturer_id",
        "ix_product_category_id",
    ):
        op.drop_index(name, table_name="product")
    op.drop_table("product")
    op.drop_table("file")
