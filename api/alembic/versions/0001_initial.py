"""schéma initial v0 (ADR-0012 : une seule migration régénérée depuis les modèles jusqu'à la v1)

Revision ID: 0001
Revises:
Create Date: 2026-10-12

Générée par `alembic revision --autogenerate` puis relue : 29 tables STRICT (DATA_MODEL §4), CHECK et
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
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("code", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "code IS NULL OR (code NOT GLOB '*[^A-Z]*' AND length(code) BETWEEN 2 AND 4)",
            name=op.f("ck_category_code_format"),
        ),
        sa.CheckConstraint(
            "(parent_id IS NULL) = (code IS NOT NULL)", name=op.f("ck_category_code_on_level1_only")
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
    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.create_index("ix_category_parent_id", ["parent_id", "sort_order"], unique=False)
        batch_op.create_index(
            "uq_category_code", ["code"], unique=True, sqlite_where=sa.text("code IS NOT NULL")
        )

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
    op.create_table(
        "po_sequence",
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("next_value", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint("next_value >= 1", name=op.f("ck_po_sequence_next_value_min")),
        sa.CheckConstraint("year BETWEEN 2000 AND 2999", name=op.f("ck_po_sequence_year_range")),
        sa.PrimaryKeyConstraint("year", name=op.f("pk_po_sequence")),
        sqlite_strict=True,
    )
    op.create_table(
        "setting",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("default_vat_bp", sa.Integer(), server_default=sa.text("(2000)"), nullable=False),
        sa.Column("base_currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column(
            "seed_category_version", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("project_code_prefix", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "default_contingency_bp", sa.Integer(), server_default=sa.text("(1000)"), nullable=False
        ),
        sa.Column("agency_name", sa.Text(), server_default="", nullable=False),
        sa.Column("agency_address", sa.Text(), nullable=True),
        sa.Column("agency_email", sa.Text(), nullable=True),
        sa.Column("agency_phone", sa.Text(), nullable=True),
        sa.Column("agency_siret", sa.Text(), nullable=True),
        sa.Column("agency_vat_number", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "agency_siret IS NULL OR agency_siret GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'",
            name=op.f("ck_setting_agency_siret_format"),
        ),
        sa.CheckConstraint("base_currency = 'EUR'", name=op.f("ck_setting_base_currency_eur")),
        sa.CheckConstraint(
            "default_vat_bp BETWEEN 0 AND 10000", name=op.f("ck_setting_default_vat_bp_range")
        ),
        sa.CheckConstraint("id = 1", name=op.f("ck_setting_single_row")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_setting")),
        sqlite_strict=True,
    )
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
        sa.Column("import_mapping", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "siren IS NULL OR siren GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'",
            name=op.f("ck_supplier_siren_format"),
        ),
        sa.CheckConstraint(
            "siret IS NULL OR (siret GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' AND (siren IS NULL OR substr(siret, 1, 9) = siren))",
            name=op.f("ck_supplier_siret_format"),
        ),
        sa.CheckConstraint(
            "default_discount_bp BETWEEN 0 AND 10000",
            name=op.f("ck_supplier_default_discount_bp_range"),
        ),
        sa.CheckConstraint(
            "length(country_code) = 2", name=op.f("ck_supplier_country_code_length")
        ),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_supplier_currency_length")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_supplier_name_not_empty")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_supplier")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("supplier", schema=None) as batch_op:
        batch_op.create_index("ix_supplier_archived_at", ["archived_at", "name"], unique=False)
        batch_op.create_index("ix_supplier_siren", ["siren"], unique=False)
        batch_op.create_index(
            "uq_supplier_siret", ["siret"], unique=True, sqlite_where=sa.text("siret IS NOT NULL")
        )

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
            "rows_total >= 0 AND rows_created >= 0 AND rows_updated >= 0 AND rows_unchanged >= 0 AND rows_skipped >= 0 AND rows_discontinued >= 0",
            name=op.f("ck_import_batch_counts_min"),
        ),
        sa.ForeignKeyConstraint(
            ["file_id"], ["file.id"], name=op.f("fk_import_batch_file_id_file"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["supplier.id"],
            name=op.f("fk_import_batch_supplier_id_supplier"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_import_batch")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("import_batch", schema=None) as batch_op:
        batch_op.create_index("ix_import_batch_supplier_id", ["supplier_id"], unique=False)

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
        sa.CheckConstraint(
            "discontinued_on IS NULL OR discontinued_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_product_discontinued_on_date"),
        ),
        sa.CheckConstraint(
            "gtin IS NULL OR gtin NOT GLOB '*[^0-9]*'", name=op.f("ck_product_gtin_digits")
        ),
        sa.CheckConstraint(
            "list_price_on IS NULL OR list_price_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_product_list_price_on_date"),
        ),
        sa.CheckConstraint(
            "list_price_tax_mode = 'ht' OR list_price_vat_bp IS NOT NULL",
            name=op.f("ck_product_list_price_ttc_needs_vat"),
        ),
        sa.CheckConstraint(
            "list_price_tax_mode IN ('ht', 'ttc')", name=op.f("ck_product_list_price_tax_mode_enum")
        ),
        sa.CheckConstraint(
            "unit IN ('piece', 'pair', 'set', 'lot', 'm', 'm2', 'roll')",
            name=op.f("ck_product_unit_enum"),
        ),
        sa.CheckConstraint("depth_mm IS NULL OR depth_mm >= 0", name=op.f("ck_product_depth_min")),
        sa.CheckConstraint(
            "diameter_mm IS NULL OR diameter_mm >= 0", name=op.f("ck_product_diameter_min")
        ),
        sa.CheckConstraint(
            "height_mm IS NULL OR height_mm >= 0", name=op.f("ck_product_height_min")
        ),
        sa.CheckConstraint(
            "lead_time_weeks IS NULL OR lead_time_weeks >= 0", name=op.f("ck_product_lead_time_min")
        ),
        sa.CheckConstraint(
            "length(list_price_currency) = 3", name=op.f("ck_product_list_price_currency_length")
        ),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_product_name_not_empty")),
        sa.CheckConstraint(
            "list_price_cents IS NULL OR list_price_cents >= 0",
            name=op.f("ck_product_list_price_min"),
        ),
        sa.CheckConstraint(
            "list_price_vat_bp IS NULL OR list_price_vat_bp BETWEEN 0 AND 10000",
            name=op.f("ck_product_list_price_vat_bp_range"),
        ),
        sa.CheckConstraint("width_mm IS NULL OR width_mm >= 0", name=op.f("ck_product_width_min")),
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
    with op.batch_alter_table("product", schema=None) as batch_op:
        batch_op.create_index("ix_product_archived_at", ["archived_at", "name"], unique=False)
        batch_op.create_index("ix_product_category_id", ["category_id"], unique=False)
        batch_op.create_index("ix_product_gtin", ["gtin"], unique=False)
        batch_op.create_index(
            "ix_product_manufacturer_id", ["manufacturer_id", "manufacturer_ref"], unique=False
        )
        batch_op.create_index("ix_product_supplier_id", ["supplier_id"], unique=False)

    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), server_default="prospect", nullable=False),
        sa.Column("site_address", sa.Text(), nullable=True),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("delivery_contact", sa.Text(), nullable=True),
        sa.Column("default_vat_bp", sa.Integer(), nullable=False),
        sa.Column("contingency_bp", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("start_on", sa.Text(), nullable=True),
        sa.Column("due_on", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "due_on IS NULL OR due_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_project_due_on_date"),
        ),
        sa.CheckConstraint(
            "start_on IS NULL OR start_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_project_start_on_date"),
        ),
        sa.CheckConstraint(
            "status IN ('prospect', 'active', 'delivered', 'closed', 'cancelled')",
            name=op.f("ck_project_status_enum"),
        ),
        sa.CheckConstraint(
            "contingency_bp BETWEEN 0 AND 10000", name=op.f("ck_project_contingency_bp_range")
        ),
        sa.CheckConstraint(
            "default_vat_bp BETWEEN 0 AND 10000", name=op.f("ck_project_default_vat_bp_range")
        ),
        sa.CheckConstraint(
            "due_on IS NULL OR start_on IS NULL OR due_on >= start_on",
            name=op.f("ck_project_due_after_start"),
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
        sa.Column("zone_code", sa.Text(), nullable=False),
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
            "project_id", "zone_code", "prefix", name=op.f("pk_item_code_sequence")
        ),
        sqlite_strict=True,
    )
    op.create_table(
        "price_observation",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("import_batch_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("list_price_cents", sa.Integer(), nullable=False),
        sa.Column("list_price_currency", sa.Text(), nullable=False),
        sa.Column("list_price_tax_mode", sa.Text(), nullable=False),
        sa.Column("observed_on", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "list_price_tax_mode IN ('ht', 'ttc')", name=op.f("ck_price_observation_tax_mode_enum")
        ),
        sa.CheckConstraint(
            "observed_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_price_observation_observed_on_date"),
        ),
        sa.CheckConstraint(
            "length(list_price_currency) = 3", name=op.f("ck_price_observation_currency_iso")
        ),
        sa.CheckConstraint("list_price_cents >= 0", name=op.f("ck_price_observation_price_min")),
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
    with op.batch_alter_table("price_observation", schema=None) as batch_op:
        batch_op.create_index("ix_price_observation_product_id", ["product_id"], unique=False)

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
        sa.Column("variant", sa.Text(), nullable=False),
        sa.Column("issued_at", sa.Text(), nullable=False),
        sa.Column("indice", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "kind IN ('schedule_xlsx', 'book_pdf')", name=op.f("ck_project_file_kind_enum")
        ),
        sa.CheckConstraint(
            "variant IN ('internal', 'client')", name=op.f("ck_project_file_variant_enum")
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
        sa.Column(
            "fx_rate_micro", sa.Integer(), server_default=sa.text("(1000000)"), nullable=False
        ),
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
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("indice", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "(status = 'replaced') = (replaced_by_id IS NOT NULL)",
            name=op.f("ck_project_item_replaced_has_successor"),
        ),
        sa.CheckConstraint(
            "currency <> 'EUR' OR fx_rate_micro = 1000000",
            name=op.f("ck_project_item_eur_rate_is_one"),
        ),
        sa.CheckConstraint(
            "expected_delivery_on IS NULL OR expected_delivery_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_project_item_expected_delivery_on_date"),
        ),
        sa.CheckConstraint(
            "kind <> 'existing' OR unit_cost_cents = 0",
            name=op.f("ck_project_item_existing_is_free"),
        ),
        sa.CheckConstraint(
            "kind IN ('ffe', 'ose', 'custom', 'existing', 'fee')",
            name=op.f("ck_project_item_kind_enum"),
        ),
        sa.CheckConstraint(
            "location IS NULL OR location IN ('floor', 'wall', 'ceiling', 'door', 'other')",
            name=op.f("ck_project_item_location_enum"),
        ),
        sa.CheckConstraint(
            "quote_valid_until IS NULL OR quote_valid_until GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_project_item_quote_valid_until_date"),
        ),
        sa.CheckConstraint(
            "quoted_on IS NULL OR quoted_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_project_item_quoted_on_date"),
        ),
        sa.CheckConstraint(
            "required_on_site IS NULL OR required_on_site GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_project_item_required_on_site_date"),
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'specified', 'quoted', 'approved', 'ordered', 'delivered', 'installed', 'cancelled', 'replaced')",
            name=op.f("ck_project_item_status_enum"),
        ),
        sa.CheckConstraint(
            "unit IN ('piece', 'pair', 'set', 'lot', 'm', 'm2', 'roll')",
            name=op.f("ck_project_item_unit_enum"),
        ),
        sa.CheckConstraint(
            "(approved_at IS NULL) = (approved_total_qty_milli IS NULL)",
            name=op.f("ck_project_item_approved_snapshot_qty"),
        ),
        sa.CheckConstraint(
            "(approved_at IS NULL) = (approved_unit_net_cents IS NULL)",
            name=op.f("ck_project_item_approved_snapshot_price"),
        ),
        sa.CheckConstraint(
            "approved_total_qty_milli IS NULL OR approved_total_qty_milli >= 0",
            name=op.f("ck_project_item_approved_total_qty_min"),
        ),
        sa.CheckConstraint(
            "approved_unit_net_cents IS NULL OR approved_unit_net_cents >= 0",
            name=op.f("ck_project_item_approved_unit_net_min"),
        ),
        sa.CheckConstraint(
            "depth_mm IS NULL OR depth_mm >= 0", name=op.f("ck_project_item_depth_min")
        ),
        sa.CheckConstraint(
            "diameter_mm IS NULL OR diameter_mm >= 0", name=op.f("ck_project_item_diameter_min")
        ),
        sa.CheckConstraint(
            "discount_bp BETWEEN 0 AND 10000", name=op.f("ck_project_item_discount_bp_range")
        ),
        sa.CheckConstraint("fx_rate_micro > 0", name=op.f("ck_project_item_fx_rate_positive")),
        sa.CheckConstraint(
            "height_mm IS NULL OR height_mm >= 0", name=op.f("ck_project_item_height_min")
        ),
        sa.CheckConstraint(
            "lead_time_weeks IS NULL OR lead_time_weeks >= 0",
            name=op.f("ck_project_item_lead_time_min"),
        ),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_project_item_currency_length")),
        sa.CheckConstraint(
            "length(item_code) > 0", name=op.f("ck_project_item_item_code_not_empty")
        ),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_project_item_name_not_empty")),
        sa.CheckConstraint("on_hold IN (0, 1)", name=op.f("ck_project_item_on_hold_bool")),
        sa.CheckConstraint(
            "quote_valid_until IS NULL OR quoted_on IS NULL OR quote_valid_until >= quoted_on",
            name=op.f("ck_project_item_quote_dates_ordered"),
        ),
        sa.CheckConstraint(
            "replaced_by_id IS NULL OR replaced_by_id <> id",
            name=op.f("ck_project_item_replaced_not_self"),
        ),
        sa.CheckConstraint("unit_cost_cents >= 0", name=op.f("ck_project_item_unit_cost_min")),
        sa.CheckConstraint(
            "vat_rate_bp BETWEEN 0 AND 10000", name=op.f("ck_project_item_vat_rate_bp_range")
        ),
        sa.CheckConstraint(
            "width_mm IS NULL OR width_mm >= 0", name=op.f("ck_project_item_width_min")
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
            ["project_id"],
            ["project.id"],
            name=op.f("fk_project_item_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["replaced_by_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_project_item_replaced_by_id_project_item",
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
        batch_op.create_index("ix_project_item_replaced_by_id", ["replaced_by_id"], unique=False)
        batch_op.create_index("ix_project_item_status", ["project_id", "status"], unique=False)
        batch_op.create_index("ix_project_item_supplier_id", ["supplier_id"], unique=False)

    op.create_table(
        "purchase_order",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="draft", nullable=False),
        sa.Column("currency", sa.Text(), nullable=False),
        sa.Column(
            "fx_rate_micro", sa.Integer(), server_default=sa.text("(1000000)"), nullable=False
        ),
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
            "currency <> 'EUR' OR fx_rate_micro = 1000000",
            name=op.f("ck_purchase_order_eur_rate_is_one"),
        ),
        sa.CheckConstraint(
            "expected_delivery_on IS NULL OR expected_delivery_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_purchase_order_expected_delivery_on_date"),
        ),
        sa.CheckConstraint(
            "issued_on IS NULL OR issued_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_purchase_order_issued_on_date"),
        ),
        sa.CheckConstraint(
            "number GLOB 'PO-[0-9][0-9][0-9][0-9]-*'", name=op.f("ck_purchase_order_number_format")
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'issued', 'acknowledged', 'partially_delivered', 'closed', 'cancelled')",
            name=op.f("ck_purchase_order_status_enum"),
        ),
        sa.CheckConstraint("fx_rate_micro >= 1", name=op.f("ck_purchase_order_fx_rate_min")),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_purchase_order_currency_iso")),
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
    with op.batch_alter_table("purchase_order", schema=None) as batch_op:
        batch_op.create_index("ix_purchase_order_project_id", ["project_id"], unique=False)
        batch_op.create_index("ix_purchase_order_supplier_id", ["supplier_id"], unique=False)

    op.create_table(
        "quote",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.Text(), nullable=False),
        sa.Column("quoted_on", sa.Text(), nullable=True),
        sa.Column("valid_until", sa.Text(), nullable=True),
        sa.Column("currency", sa.Text(), nullable=False),
        sa.Column(
            "fx_rate_micro", sa.Integer(), server_default=sa.text("(1000000)"), nullable=False
        ),
        sa.Column("declined_at", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "currency <> 'EUR' OR fx_rate_micro = 1000000", name=op.f("ck_quote_eur_rate_is_one")
        ),
        sa.CheckConstraint(
            "quoted_on IS NULL OR quoted_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_quote_quoted_on_date"),
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_until GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_quote_valid_until_date"),
        ),
        sa.CheckConstraint("fx_rate_micro >= 1", name=op.f("ck_quote_fx_rate_min")),
        sa.CheckConstraint("length(currency) = 3", name=op.f("ck_quote_currency_iso")),
        sa.CheckConstraint("length(reference) > 0", name=op.f("ck_quote_reference_not_empty")),
        sa.CheckConstraint(
            "valid_until IS NULL OR quoted_on IS NULL OR valid_until >= quoted_on",
            name=op.f("ck_quote_valid_after_quoted"),
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
    with op.batch_alter_table("quote", schema=None) as batch_op:
        batch_op.create_index("ix_quote_supplier_id", ["supplier_id"], unique=False)

    op.create_table(
        "zone",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=True),
        sa.Column("multiplier", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(code) > 0", name=op.f("ck_zone_code_not_empty")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_zone_name_not_empty")),
        sa.CheckConstraint("multiplier >= 1", name=op.f("ck_zone_multiplier_min")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_zone_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_zone")),
        sa.UniqueConstraint("id", "project_id", name="uq_zone_id"),
        sa.UniqueConstraint("project_id", "code", name="uq_zone_project_id"),
        sqlite_strict=True,
    )
    with op.batch_alter_table("zone", schema=None) as batch_op:
        batch_op.create_index("ix_zone_project_id", ["project_id", "sort_order"], unique=False)

    op.create_table(
        "budget_line",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("zone_id", sa.Integer(), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("amount_cents >= 0", name=op.f("ck_budget_line_amount_min")),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            name=op.f("fk_budget_line_category_id_category"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_budget_line_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["zone_id", "project_id"],
            ["zone.id", "zone.project_id"],
            name="fk_budget_line_zone_id_zone",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_budget_line")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("budget_line", schema=None) as batch_op:
        batch_op.create_index("ix_budget_line_project_id", ["project_id"], unique=False)

    op.create_table(
        "delivery",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchase_order_id", sa.Integer(), nullable=False),
        sa.Column("received_on", sa.Text(), nullable=False),
        sa.Column("reference", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "received_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_delivery_received_on_date"),
        ),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_order.id"],
            name=op.f("fk_delivery_purchase_order_id_purchase_order"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_delivery")),
        sqlite_strict=True,
    )
    with op.batch_alter_table("delivery", schema=None) as batch_op:
        batch_op.create_index("ix_delivery_purchase_order_id", ["purchase_order_id"], unique=False)

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
        sa.Column("kind", sa.Text(), server_default="other", nullable=False),
        sa.Column("is_primary", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "is_primary = 0 OR kind = 'image'", name=op.f("ck_project_item_file_primary_is_image")
        ),
        sa.CheckConstraint(
            "kind IN ('image', 'quote', 'approval', 'drawing', 'other')",
            name=op.f("ck_project_item_file_kind_enum"),
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
        sa.Column("zone_id", sa.Integer(), nullable=True),
        sa.Column("qty_milli", sa.Integer(), server_default=sa.text("(1000)"), nullable=False),
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
    with op.batch_alter_table("project_item_placement", schema=None) as batch_op:
        batch_op.create_index(
            "ix_project_item_placement_project_id",
            ["project_id", "zone_id", "sort_order"],
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
            ["file_id"],
            ["file.id"],
            name=op.f("fk_purchase_order_file_file_id_file"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_order.id"],
            name=op.f("fk_purchase_order_file_purchase_order_id_purchase_order"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_purchase_order_file")),
        sa.UniqueConstraint(
            "purchase_order_id", "file_id", name="uq_purchase_order_file_purchase_order_id"
        ),
        sqlite_strict=True,
    )
    with op.batch_alter_table("purchase_order_file", schema=None) as batch_op:
        batch_op.create_index("ix_purchase_order_file_file_id", ["file_id"], unique=False)

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
            "discount_bp BETWEEN 0 AND 10000", name=op.f("ck_purchase_order_line_discount_bp_range")
        ),
        sa.CheckConstraint(
            "length(description) > 0", name=op.f("ck_purchase_order_line_description_not_empty")
        ),
        sa.CheckConstraint("qty_milli >= 0", name=op.f("ck_purchase_order_line_qty_min")),
        sa.CheckConstraint(
            "unit_cost_cents >= 0", name=op.f("ck_purchase_order_line_unit_cost_min")
        ),
        sa.CheckConstraint(
            "vat_rate_bp BETWEEN 0 AND 10000", name=op.f("ck_purchase_order_line_vat_rate_bp_range")
        ),
        sa.ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_purchase_order_line_project_item_id_project_item",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_order.id"],
            name=op.f("fk_purchase_order_line_purchase_order_id_purchase_order"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_purchase_order_line")),
        sa.UniqueConstraint(
            "purchase_order_id", "project_item_id", name="uq_purchase_order_line_purchase_order_id"
        ),
        sqlite_strict=True,
    )
    with op.batch_alter_table("purchase_order_line", schema=None) as batch_op:
        batch_op.create_index(
            "ix_purchase_order_line_project_item_id", ["project_item_id"], unique=False
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
            ["file_id"], ["file.id"], name=op.f("fk_quote_file_file_id_file"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quote.id"],
            name=op.f("fk_quote_file_quote_id_quote"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quote_file")),
        sa.UniqueConstraint("quote_id", "file_id", name="uq_quote_file_quote_id"),
        sqlite_strict=True,
    )
    with op.batch_alter_table("quote_file", schema=None) as batch_op:
        batch_op.create_index("ix_quote_file_file_id", ["file_id"], unique=False)

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
        sa.CheckConstraint(
            "discount_bp BETWEEN 0 AND 10000", name=op.f("ck_quote_line_discount_bp_range")
        ),
        sa.CheckConstraint(
            "lead_time_weeks IS NULL OR lead_time_weeks >= 0",
            name=op.f("ck_quote_line_lead_time_min"),
        ),
        sa.CheckConstraint("unit_cost_cents >= 0", name=op.f("ck_quote_line_unit_cost_min")),
        sa.ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_quote_line_project_item_id_project_item",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quote.id"],
            name=op.f("fk_quote_line_quote_id_quote"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quote_line")),
        sa.UniqueConstraint("quote_id", "project_item_id", name="uq_quote_line_quote_id"),
        sqlite_strict=True,
    )
    with op.batch_alter_table("quote_line", schema=None) as batch_op:
        batch_op.create_index("ix_quote_line_project_item_id", ["project_item_id"], unique=False)
        batch_op.create_index(
            "uq_quote_line_retained",
            ["project_item_id"],
            unique=True,
            sqlite_where=sa.text("retained_at IS NOT NULL"),
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
            "due_on IS NULL OR due_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_supplier_invoice_due_on_date"),
        ),
        sa.CheckConstraint(
            "invoiced_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_supplier_invoice_invoiced_on_date"),
        ),
        sa.CheckConstraint(
            "kind IN ('deposit', 'balance', 'other')", name=op.f("ck_supplier_invoice_kind_enum")
        ),
        sa.CheckConstraint(
            "paid_on IS NULL OR paid_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
            name=op.f("ck_supplier_invoice_paid_on_date"),
        ),
        sa.CheckConstraint("amount_ht_cents >= 0", name=op.f("ck_supplier_invoice_amount_ht_min")),
        sa.CheckConstraint(
            "length(reference) > 0", name=op.f("ck_supplier_invoice_reference_not_empty")
        ),
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
    with op.batch_alter_table("supplier_invoice", schema=None) as batch_op:
        batch_op.create_index(
            "ix_supplier_invoice_purchase_order_id", ["purchase_order_id"], unique=False
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
    with op.batch_alter_table("delivery_line", schema=None) as batch_op:
        batch_op.create_index(
            "ix_delivery_line_purchase_order_line_id", ["purchase_order_line_id"], unique=False
        )

    # Expression indexes (not reflectable by Alembic on SQLite) and the single setting row.
    op.execute(
        "CREATE UNIQUE INDEX uq_category_parent_name ON category (COALESCE(parent_id, 0), name)"
    )
    op.execute("CREATE UNIQUE INDEX uq_manufacturer_name_lower ON manufacturer (lower(name))")
    op.execute(
        "CREATE UNIQUE INDEX uq_budget_line_scope ON budget_line "
        "(project_id, COALESCE(zone_id, 0), COALESCE(category_id, 0))"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_project_item_placement_zone "
        "ON project_item_placement (project_item_id, COALESCE(zone_id, 0))"
    )
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    op.execute(
        sa.text(
            "INSERT INTO setting (id, default_vat_bp, base_currency, created_at, updated_at) "
            "VALUES (1, 2000, 'EUR', :now, :now)"
        ).bindparams(now=now)
    )


def downgrade() -> None:
    op.execute("DROP INDEX uq_project_item_placement_zone")
    op.execute("DROP INDEX uq_budget_line_scope")
    op.execute("DROP INDEX uq_manufacturer_name_lower")
    op.execute("DROP INDEX uq_category_parent_name")
    with op.batch_alter_table("delivery_line", schema=None) as batch_op:
        batch_op.drop_index("ix_delivery_line_purchase_order_line_id")

    op.drop_table("delivery_line")
    with op.batch_alter_table("supplier_invoice", schema=None) as batch_op:
        batch_op.drop_index("ix_supplier_invoice_purchase_order_id")

    op.drop_table("supplier_invoice")
    with op.batch_alter_table("quote_line", schema=None) as batch_op:
        batch_op.drop_index(
            "uq_quote_line_retained", sqlite_where=sa.text("retained_at IS NOT NULL")
        )
        batch_op.drop_index("ix_quote_line_project_item_id")

    op.drop_table("quote_line")
    with op.batch_alter_table("quote_file", schema=None) as batch_op:
        batch_op.drop_index("ix_quote_file_file_id")

    op.drop_table("quote_file")
    with op.batch_alter_table("purchase_order_line", schema=None) as batch_op:
        batch_op.drop_index("ix_purchase_order_line_project_item_id")

    op.drop_table("purchase_order_line")
    with op.batch_alter_table("purchase_order_file", schema=None) as batch_op:
        batch_op.drop_index("ix_purchase_order_file_file_id")

    op.drop_table("purchase_order_file")
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
    with op.batch_alter_table("delivery", schema=None) as batch_op:
        batch_op.drop_index("ix_delivery_purchase_order_id")

    op.drop_table("delivery")
    with op.batch_alter_table("budget_line", schema=None) as batch_op:
        batch_op.drop_index("ix_budget_line_project_id")

    op.drop_table("budget_line")
    with op.batch_alter_table("zone", schema=None) as batch_op:
        batch_op.drop_index("ix_zone_project_id")

    op.drop_table("zone")
    with op.batch_alter_table("quote", schema=None) as batch_op:
        batch_op.drop_index("ix_quote_supplier_id")

    op.drop_table("quote")
    with op.batch_alter_table("purchase_order", schema=None) as batch_op:
        batch_op.drop_index("ix_purchase_order_supplier_id")
        batch_op.drop_index("ix_purchase_order_project_id")

    op.drop_table("purchase_order")
    with op.batch_alter_table("project_item", schema=None) as batch_op:
        batch_op.drop_index("ix_project_item_supplier_id")
        batch_op.drop_index("ix_project_item_status")
        batch_op.drop_index("ix_project_item_replaced_by_id")
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
    with op.batch_alter_table("price_observation", schema=None) as batch_op:
        batch_op.drop_index("ix_price_observation_product_id")

    op.drop_table("price_observation")
    op.drop_table("item_code_sequence")
    with op.batch_alter_table("project", schema=None) as batch_op:
        batch_op.drop_index("ix_project_status")
        batch_op.drop_index("ix_project_client_id")

    op.drop_table("project")
    with op.batch_alter_table("product", schema=None) as batch_op:
        batch_op.drop_index("ix_product_supplier_id")
        batch_op.drop_index("ix_product_manufacturer_id")
        batch_op.drop_index("ix_product_gtin")
        batch_op.drop_index("ix_product_category_id")
        batch_op.drop_index("ix_product_archived_at")

    op.drop_table("product")
    with op.batch_alter_table("import_batch", schema=None) as batch_op:
        batch_op.drop_index("ix_import_batch_supplier_id")

    op.drop_table("import_batch")
    with op.batch_alter_table("supplier", schema=None) as batch_op:
        batch_op.drop_index("uq_supplier_siret", sqlite_where=sa.text("siret IS NOT NULL"))
        batch_op.drop_index("ix_supplier_siren")
        batch_op.drop_index("ix_supplier_archived_at")

    op.drop_table("supplier")
    op.drop_table("setting")
    op.drop_table("po_sequence")
    op.drop_table("manufacturer")
    op.drop_table("file")
    with op.batch_alter_table("client", schema=None) as batch_op:
        batch_op.drop_index("ix_client_archived_at")

    op.drop_table("client")
    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.drop_index("uq_category_code", sqlite_where=sa.text("code IS NOT NULL"))
        batch_op.drop_index("ix_category_parent_id")

    op.drop_table("category")
