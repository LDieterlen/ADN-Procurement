"""référentiel : category, manufacturer, supplier ; setting.seed_category_version (étape 6a)

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-10

Écrite à la main d'après DATA_MODEL §4.5, §4.6, §4.7 et §4.1 (D2.8, D6a.10). Additive : trois
CREATE TABLE STRICT, leurs index (dont trois index d'expression ou partiels écrits en SQL),
un ADD COLUMN avec défaut sur `setting`. Pas de données : le seed des catégories est `ffe db seed`.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SIREN_GLOB = "GLOB '" + "[0-9]" * 9 + "'"
SIRET_GLOB = "GLOB '" + "[0-9]" * 14 + "'"


def upgrade() -> None:
    op.create_table(
        "category",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("code", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "(parent_id IS NULL) = (code IS NOT NULL)", name=op.f("ck_category_code_on_level1_only")
        ),
        sa.CheckConstraint(
            "code IS NULL OR (code NOT GLOB '*[^A-Z]*' AND length(code) BETWEEN 2 AND 4)",
            name=op.f("ck_category_code_format"),
        ),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_category_name_not_empty")),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["category.id"],
            name=op.f("fk_category_parent_id_category"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_category")),
        sqlite_strict=True,
    )
    op.create_index("ix_category_parent_id", "category", ["parent_id", "sort_order"], unique=False)
    op.execute(
        "CREATE UNIQUE INDEX uq_category_parent_name ON category (COALESCE(parent_id, 0), name)"
    )
    op.execute("CREATE UNIQUE INDEX uq_category_code ON category (code) WHERE code IS NOT NULL")

    op.create_table(
        "manufacturer",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_manufacturer_name_not_empty")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_manufacturer")),
        sqlite_strict=True,
    )
    op.execute("CREATE UNIQUE INDEX uq_manufacturer_name_lower ON manufacturer (lower(name))")

    op.create_table(
        "supplier",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("legal_name", sa.Text(), nullable=True),
        sa.Column("country_code", sa.Text(), server_default="FR", nullable=False),
        sa.Column("siren", sa.Text(), nullable=True),
        sa.Column("siret", sa.Text(), nullable=True),
        sa.Column("vat_number", sa.Text(), nullable=True),
        sa.Column("address_line1", sa.Text(), nullable=True),
        sa.Column("address_line2", sa.Text(), nullable=True),
        sa.Column("postal_code", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("contact_name", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column("default_discount_bp", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("payment_terms", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_supplier_name_not_empty")),
        sa.CheckConstraint(
            "length(country_code) = 2", name=op.f("ck_supplier_country_code_length")
        ),
        sa.CheckConstraint(
            f"siren IS NULL OR siren {SIREN_GLOB}", name=op.f("ck_supplier_siren_format")
        ),
        sa.CheckConstraint(
            f"siret IS NULL OR (siret {SIRET_GLOB} AND (siren IS NULL OR substr(siret, 1, 9) = siren))",
            name=op.f("ck_supplier_siret_format"),
        ),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_supplier_currency_length")),
        sa.CheckConstraint(
            "default_discount_bp BETWEEN 0 AND 10000",
            name=op.f("ck_supplier_default_discount_bp_range"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_supplier")),
        sqlite_strict=True,
    )
    op.create_index("ix_supplier_archived_at", "supplier", ["archived_at", "name"], unique=False)
    op.create_index("ix_supplier_siren", "supplier", ["siren"], unique=False)
    op.execute("CREATE UNIQUE INDEX uq_supplier_siret ON supplier (siret) WHERE siret IS NOT NULL")

    op.execute("ALTER TABLE setting ADD COLUMN seed_category_version INTEGER NOT NULL DEFAULT 0")


def downgrade() -> None:
    # SQLite ≥ 3.35 supports DROP COLUMN; the column carries no constraint besides its default.
    op.execute("ALTER TABLE setting DROP COLUMN seed_category_version")
    op.drop_index("ix_supplier_siren", table_name="supplier")
    op.drop_index("ix_supplier_archived_at", table_name="supplier")
    op.execute("DROP INDEX uq_supplier_siret")
    op.drop_table("supplier")
    op.execute("DROP INDEX uq_manufacturer_name_lower")
    op.drop_table("manufacturer")
    op.execute("DROP INDEX uq_category_code")
    op.execute("DROP INDEX uq_category_parent_name")
    op.drop_index("ix_category_parent_id", table_name="category")
    op.drop_table("category")
