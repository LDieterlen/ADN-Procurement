"""schéma initial v0 (ADR-0012, ADR-0013 : une seule migration régénérée depuis les modèles jusqu'à la v1)

Revision ID: 0001
Revises:
Create Date: 2026-10-12

Générée par `alembic revision --autogenerate` puis relue : 17 tables STRICT (DATA_MODEL §4), CHECK et
UNIQUE des modèles, index partiels rendus par Alembic ; les quatre index d'expression (COALESCE,
lower) et la ligne unique de `setting` sont écrits à la main en fin d'`upgrade`. Tant que la v1 n'est
pas déclarée, ce fichier est le seul de l'historique et se régénère à chaque changement de modèle.
"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "category",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "code NOT GLOB '*[^A-Z]*' AND length(code) BETWEEN 2 AND 4",
            name=op.f("ck_category_code_format"),
        ),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_category_name_not_empty")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_category")),
        sa.UniqueConstraint("code", name=op.f("uq_category_code")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.create_index("ix_category_sort_order", ["sort_order"], unique=False)

    op.create_table(
        "client",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), server_default="individual", nullable=False),
        sa.Column("contact_name", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("address_line1", sa.Text(), nullable=True),
        sa.Column("address_line2", sa.Text(), nullable=True),
        sa.Column("postal_code", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("country_code", sa.Text(), server_default="FR", nullable=False),
        sa.Column("siren", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("kind IN ('individual', 'company')", name=op.f("ck_client_kind_enum")),
        sa.CheckConstraint(
            "siren IS NULL OR siren GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'",
            name=op.f("ck_client_siren_format"),
        ),
        sa.CheckConstraint("length(country_code) = 2", name=op.f("ck_client_country_code_length")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_client_name_not_empty")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_client")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("client", schema=None) as batch_op:
        batch_op.create_index("ix_client_archived_at", ["archived_at", "name"], unique=False)

    op.create_table(
        "file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.Text(), nullable=False),
        sa.Column("ext", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("original_name", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("license_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(ext) BETWEEN 1 AND 10", name=op.f("ck_file_ext_length")),
        sa.CheckConstraint("length(sha256) = 64", name=op.f("ck_file_sha256_length")),
        sa.CheckConstraint("size_bytes >= 0", name=op.f("ck_file_size_bytes_min")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_file")),
        sa.UniqueConstraint("sha256", name=op.f("uq_file_sha256")),
        sqlite_strict=True,
    )
    op.create_table(
        "professional",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), server_default="manufacturer", nullable=False),
        sa.Column("specialty", sa.Text(), nullable=True),
        sa.Column("contact_name", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("mobile", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("contact2_name", sa.Text(), nullable=True),
        sa.Column("contact2_phone", sa.Text(), nullable=True),
        sa.Column("contact2_email", sa.Text(), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('manufacturer','distributor','publisher','artisan')",
            name=op.f("ck_professional_kind_values"),
        ),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_professional_name_not_empty")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_professional")),
        sqlite_strict=True,
    )
    op.create_table(
        "setting",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("base_currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column(
            "seed_category_version", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("project_code_prefix", sa.Text(), server_default="", nullable=False),
        sa.Column("agency_name", sa.Text(), server_default="", nullable=False),
        sa.Column("agency_address", sa.Text(), nullable=True),
        sa.Column("agency_email", sa.Text(), nullable=True),
        sa.Column("agency_phone", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("base_currency = 'EUR'", name=op.f("ck_setting_base_currency_eur")),
        sa.CheckConstraint("id = 1", name=op.f("ck_setting_single_row")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_setting")),
        sqlite_strict=True,
    )
    op.create_table(
        "supplier",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("specialty", sa.Text(), nullable=True),
        sa.Column("contact_name", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("mobile", sa.Text(), nullable=True),
        sa.Column("contact2_name", sa.Text(), nullable=True),
        sa.Column("contact2_phone", sa.Text(), nullable=True),
        sa.Column("contact2_email", sa.Text(), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_supplier_currency_length")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_supplier_name_not_empty")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_supplier")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("supplier", schema=None) as batch_op:
        batch_op.create_index("ix_supplier_archived_at", ["archived_at", "name"], unique=False)

    op.create_table(
        "product",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.Text(), nullable=True),
        sa.Column("supplier_id", sa.Integer(), nullable=True),
        sa.Column("list_price_cents", sa.Integer(), nullable=True),
        sa.Column("currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column("dimensions", sa.Text(), nullable=True),
        sa.Column("finish", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_product_currency_length")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_product_name_not_empty")),
        sa.CheckConstraint(
            "list_price_cents IS NULL OR list_price_cents >= 0",
            name=op.f("ck_product_list_price_min"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            name=op.f("fk_product_category_id_category"),
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
    with op.batch_alter_table("product", schema=None) as batch_op:
        batch_op.create_index("ix_product_archived_at", ["archived_at", "name"], unique=False)
        batch_op.create_index("ix_product_category_id", ["category_id"], unique=False)
        batch_op.create_index("ix_product_reference", ["supplier_id", "reference"], unique=False)
        batch_op.create_index("ix_product_supplier_id", ["supplier_id"], unique=False)

    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), server_default="prospect", nullable=False),
        sa.Column("site_address", sa.Text(), nullable=True),
        sa.Column("due_on", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "due_on IS NULL OR due_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_project_due_on_date"),
        ),
        sa.CheckConstraint(
            "status IN ('prospect', 'active', 'delivered', 'closed', 'cancelled')",
            name=op.f("ck_project_status_enum"),
        ),
        sa.CheckConstraint("length(code) > 0", name=op.f("ck_project_code_not_empty")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_project_name_not_empty")),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["client.id"],
            name=op.f("fk_project_client_id_client"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project")),
        sa.UniqueConstraint("code", name=op.f("uq_project_code")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("project", schema=None) as batch_op:
        batch_op.create_index("ix_project_client_id", ["client_id"], unique=False)
        batch_op.create_index("ix_project_status", ["status"], unique=False)

    op.create_table(
        "item_code_sequence",
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("location_code", sa.Text(), nullable=False),
        sa.Column("prefix", sa.Text(), nullable=False),
        sa.Column("next_value", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint(
            "length(prefix) BETWEEN 2 AND 4", name=op.f("ck_item_code_sequence_prefix_length")
        ),
        sa.CheckConstraint("next_value >= 1", name=op.f("ck_item_code_sequence_next_value_min")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_item_code_sequence_project_id_project"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "project_id", "location_code", "prefix", name=op.f("pk_item_code_sequence")
        ),
        sqlite_strict=True,
    )
    op.create_table(
        "location",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("zone", sa.Text(), nullable=True),
        sa.Column("level", sa.Text(), nullable=True),
        sa.Column("multiplier", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(code) > 0", name=op.f("ck_location_code_not_empty")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_location_name_not_empty")),
        sa.CheckConstraint("multiplier >= 1", name=op.f("ck_location_multiplier_min")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_location_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location")),
        sa.UniqueConstraint("id", "project_id", name="uq_location_id"),
        sa.UniqueConstraint("project_id", "code", name="uq_location_project_id"),
        sqlite_strict=True,
    )
    with op.batch_alter_table("location", schema=None) as batch_op:
        batch_op.create_index("ix_location_project_id", ["project_id", "sort_order"], unique=False)

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
            "is_primary = 0 OR kind = 'image'", name=op.f("ck_product_file_primary_is_image")
        ),
        sa.CheckConstraint(
            "kind IN ('image', 'datasheet', 'drawing', 'other')",
            name=op.f("ck_product_file_kind_enum"),
        ),
        sa.CheckConstraint("is_primary IN (0, 1)", name=op.f("ck_product_file_is_primary_bool")),
        sa.ForeignKeyConstraint(
            ["file_id"], ["file.id"], name=op.f("fk_product_file_file_id_file"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            name=op.f("fk_product_file_product_id_product"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_file")),
        sa.UniqueConstraint("product_id", "file_id", name="uq_product_file_product_id"),
        sqlite_strict=True,
    )
    with op.batch_alter_table("product_file", schema=None) as batch_op:
        batch_op.create_index("ix_product_file_file_id", ["file_id"], unique=False)
        batch_op.create_index(
            "uq_product_file_primary",
            ["product_id"],
            unique=True,
            sqlite_where=sa.text("is_primary = 1"),
        )

    op.create_table(
        "project_file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("issued_at", sa.Text(), nullable=False),
        sa.Column("indice", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "kind IN ('sheets_pdf', 'list_pdf')", name=op.f("ck_project_file_kind_enum")
        ),
        sa.ForeignKeyConstraint(
            ["file_id"], ["file.id"], name=op.f("fk_project_file_file_id_file"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_project_file_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_file")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("project_file", schema=None) as batch_op:
        batch_op.create_index("ix_project_file_file_id", ["file_id"], unique=False)
        batch_op.create_index("ix_project_file_project_id", ["project_id"], unique=False)

    op.create_table(
        "project_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("item_code", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), server_default="product", nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("supplier_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("reference", sa.Text(), nullable=True),
        sa.Column("family", sa.Text(), nullable=True),
        sa.Column("usage", sa.Text(), nullable=True),
        sa.Column("finish", sa.Text(), nullable=True),
        sa.Column("dimensions", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("unit_cost_cents", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column(
            "fx_rate_micro", sa.Integer(), server_default=sa.text("(1000000)"), nullable=False
        ),
        sa.Column("discount_bp", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("quote_ref", sa.Text(), nullable=True),
        sa.Column("quote_indice", sa.Text(), nullable=True),
        sa.Column("quote_url", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default="to_quote", nullable=False),
        sa.Column("indice", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "(kind = 'fee') = (category_id IS NULL)", name=op.f("ck_project_item_fee_has_no_type")
        ),
        sa.CheckConstraint(
            "currency <> 'EUR' OR fx_rate_micro = 1000000",
            name=op.f("ck_project_item_eur_rate_is_one"),
        ),
        sa.CheckConstraint(
            "family IS NULL OR family IN ('custom', 'joinery', 'ose', 'edition', 'gallery', 'artwork', 'textile')",
            name=op.f("ck_project_item_family_enum"),
        ),
        sa.CheckConstraint("kind IN ('product', 'fee')", name=op.f("ck_project_item_kind_enum")),
        sa.CheckConstraint(
            "status IN ('to_quote', 'quoted', 'to_review', 'approved', 'deposit', 'purchased', 'cancelled')",
            name=op.f("ck_project_item_status_enum"),
        ),
        sa.CheckConstraint(
            "usage IS NULL OR usage IN ('indoor', 'outdoor')",
            name=op.f("ck_project_item_usage_enum"),
        ),
        sa.CheckConstraint(
            "discount_bp BETWEEN 0 AND 10000", name=op.f("ck_project_item_discount_bp_range")
        ),
        sa.CheckConstraint("fx_rate_micro > 0", name=op.f("ck_project_item_fx_rate_positive")),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_project_item_currency_length")),
        sa.CheckConstraint(
            "length(item_code) > 0", name=op.f("ck_project_item_item_code_not_empty")
        ),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_project_item_name_not_empty")),
        sa.CheckConstraint("unit_cost_cents >= 0", name=op.f("ck_project_item_unit_cost_min")),
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
            ["project_id"],
            ["project.id"],
            name=op.f("fk_project_item_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_project_item_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_item")),
        sa.UniqueConstraint("id", "project_id", name="uq_project_item_id"),
        sa.UniqueConstraint("project_id", "item_code", name="uq_project_item_project_id"),
        sqlite_strict=True,
    )
    with op.batch_alter_table("project_item", schema=None) as batch_op:
        batch_op.create_index("ix_project_item_category_id", ["category_id"], unique=False)
        batch_op.create_index("ix_project_item_product_id", ["product_id"], unique=False)
        batch_op.create_index(
            "ix_project_item_project_id", ["project_id", "sort_order"], unique=False
        )
        batch_op.create_index("ix_project_item_status", ["project_id", "status"], unique=False)
        batch_op.create_index("ix_project_item_supplier_id", ["supplier_id"], unique=False)

    op.create_table(
        "budget_line",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("zone", sa.Text(), nullable=True),
        sa.Column("family", sa.Text(), nullable=True),
        sa.Column("supplier_id", sa.Integer(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "(scope = 'family') = (family IS NOT NULL)", name=op.f("ck_budget_line_scope_family")
        ),
        sa.CheckConstraint(
            "(scope = 'location') = (location_id IS NOT NULL)",
            name=op.f("ck_budget_line_scope_location"),
        ),
        sa.CheckConstraint(
            "(scope = 'supplier') = (supplier_id IS NOT NULL)",
            name=op.f("ck_budget_line_scope_supplier"),
        ),
        sa.CheckConstraint(
            "(scope = 'zone') = (zone IS NOT NULL)", name=op.f("ck_budget_line_scope_zone")
        ),
        sa.CheckConstraint(
            "scope IN ('global', 'location', 'zone', 'family', 'supplier')",
            name=op.f("ck_budget_line_scope_enum"),
        ),
        sa.CheckConstraint("amount_cents >= 0", name=op.f("ck_budget_line_amount_min")),
        sa.ForeignKeyConstraint(
            ["location_id", "project_id"],
            ["location.id", "location.project_id"],
            name="fk_budget_line_location_id_location",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_budget_line_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_budget_line_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_budget_line")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("budget_line", schema=None) as batch_op:
        batch_op.create_index("ix_budget_line_project_id", ["project_id"], unique=False)

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
    with op.batch_alter_table("project_item_event", schema=None) as batch_op:
        batch_op.create_index(
            "ix_project_item_event_project_item_id", ["project_item_id", "changed_at"], unique=False
        )

    op.create_table(
        "project_item_file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_item_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), server_default="image", nullable=False),
        sa.Column("is_primary", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "is_primary = 0 OR kind = 'image'", name=op.f("ck_project_item_file_primary_is_image")
        ),
        sa.CheckConstraint(
            "kind IN ('image', 'drawing', 'other')", name=op.f("ck_project_item_file_kind_enum")
        ),
        sa.CheckConstraint(
            "is_primary IN (0, 1)", name=op.f("ck_project_item_file_is_primary_bool")
        ),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["file.id"],
            name=op.f("fk_project_item_file_file_id_file"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["project_item_id"],
            ["project_item.id"],
            name=op.f("fk_project_item_file_project_item_id_project_item"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_item_file")),
        sa.UniqueConstraint(
            "project_item_id", "file_id", name="uq_project_item_file_project_item_id"
        ),
        sqlite_strict=True,
    )
    with op.batch_alter_table("project_item_file", schema=None) as batch_op:
        batch_op.create_index("ix_project_item_file_file_id", ["file_id"], unique=False)
        batch_op.create_index(
            "uq_project_item_file_primary",
            ["project_item_id"],
            unique=True,
            sqlite_where=sa.text("is_primary = 1"),
        )

    op.create_table(
        "project_item_placement",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_item_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("qty_milli", sa.Integer(), server_default=sa.text("(1000)"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("qty_milli >= 0", name=op.f("ck_project_item_placement_qty_min")),
        sa.ForeignKeyConstraint(
            ["location_id", "project_id"],
            ["location.id", "location.project_id"],
            name="fk_project_item_placement_location_id_location",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_project_item_placement_project_item_id_project_item",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_item_placement")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("project_item_placement", schema=None) as batch_op:
        batch_op.create_index(
            "ix_project_item_placement_project_id",
            ["project_id", "location_id", "sort_order"],
            unique=False,
        )

    # Expression indexes (DATA_MODEL §3): SQLite cannot reflect them, so Alembic skips them.
    op.execute("CREATE UNIQUE INDEX uq_category_name_lower ON category (lower(name))")
    op.execute("CREATE UNIQUE INDEX uq_professional_name_lower ON professional (lower(name))")
    op.execute(
        "CREATE UNIQUE INDEX uq_project_item_placement_location "
        "ON project_item_placement (project_item_id, COALESCE(location_id, 0))"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_budget_line_scope ON budget_line "
        "(project_id, scope, COALESCE(location_id, 0), COALESCE(zone, ''), "
        "COALESCE(family, ''), COALESCE(supplier_id, 0))"
    )
    # The single settings row (DATA_MODEL §4.1), every other column at its server default.
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    op.execute(
        sa.text(
            "INSERT INTO setting (id, created_at, updated_at) VALUES (1, :now, :now)"
        ).bindparams(now=now)
    )


def downgrade() -> None:
    op.execute("DROP INDEX uq_budget_line_scope")
    op.execute("DROP INDEX uq_project_item_placement_location")
    op.execute("DROP INDEX uq_professional_name_lower")
    op.execute("DROP INDEX uq_category_name_lower")
    with op.batch_alter_table("project_item_placement", schema=None) as batch_op:
        batch_op.drop_index("ix_project_item_placement_project_id")

    op.drop_table("project_item_placement")
    with op.batch_alter_table("project_item_file", schema=None) as batch_op:
        batch_op.drop_index("uq_project_item_file_primary", sqlite_where=sa.text("is_primary = 1"))
        batch_op.drop_index("ix_project_item_file_file_id")

    op.drop_table("project_item_file")
    with op.batch_alter_table("project_item_event", schema=None) as batch_op:
        batch_op.drop_index("ix_project_item_event_project_item_id")

    op.drop_table("project_item_event")
    with op.batch_alter_table("budget_line", schema=None) as batch_op:
        batch_op.drop_index("ix_budget_line_project_id")

    op.drop_table("budget_line")
    with op.batch_alter_table("project_item", schema=None) as batch_op:
        batch_op.drop_index("ix_project_item_supplier_id")
        batch_op.drop_index("ix_project_item_status")
        batch_op.drop_index("ix_project_item_project_id")
        batch_op.drop_index("ix_project_item_product_id")
        batch_op.drop_index("ix_project_item_category_id")

    op.drop_table("project_item")
    with op.batch_alter_table("project_file", schema=None) as batch_op:
        batch_op.drop_index("ix_project_file_project_id")
        batch_op.drop_index("ix_project_file_file_id")

    op.drop_table("project_file")
    with op.batch_alter_table("product_file", schema=None) as batch_op:
        batch_op.drop_index("uq_product_file_primary", sqlite_where=sa.text("is_primary = 1"))
        batch_op.drop_index("ix_product_file_file_id")

    op.drop_table("product_file")
    with op.batch_alter_table("location", schema=None) as batch_op:
        batch_op.drop_index("ix_location_project_id")

    op.drop_table("location")
    op.drop_table("item_code_sequence")
    with op.batch_alter_table("project", schema=None) as batch_op:
        batch_op.drop_index("ix_project_status")
        batch_op.drop_index("ix_project_client_id")

    op.drop_table("project")
    with op.batch_alter_table("product", schema=None) as batch_op:
        batch_op.drop_index("ix_product_supplier_id")
        batch_op.drop_index("ix_product_reference")
        batch_op.drop_index("ix_product_category_id")
        batch_op.drop_index("ix_product_archived_at")

    op.drop_table("product")
    with op.batch_alter_table("supplier", schema=None) as batch_op:
        batch_op.drop_index("ix_supplier_archived_at")

    op.drop_table("supplier")
    op.drop_table("setting")
    op.drop_table("professional")
    op.drop_table("file")
    with op.batch_alter_table("client", schema=None) as batch_op:
        batch_op.drop_index("ix_client_archived_at")

    op.drop_table("client")
    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.drop_index("ix_category_sort_order")

    op.drop_table("category")
