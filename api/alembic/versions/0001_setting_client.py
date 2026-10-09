"""setting et client (étape 3)

Revision ID: 0001
Revises:
Create Date: 2026-10-09

Écrite à la main d'après DATA_MODEL §4.1 (colonnes de l'étape 3 seulement, D2.8) et §4.2.
Additive : deux CREATE TABLE STRICT, un index, une ligne de réglages.
"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SIREN_GLOB = "GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'"


def upgrade() -> None:
    op.create_table(
        "setting",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("default_vat_bp", sa.Integer(), server_default=sa.text("2000"), nullable=False),
        sa.Column("base_currency", sa.Text(), server_default="EUR", nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("id = 1", name=op.f("ck_setting_single_row")),
        sa.CheckConstraint(
            "default_vat_bp BETWEEN 0 AND 10000", name=op.f("ck_setting_default_vat_bp_range")
        ),
        sa.CheckConstraint("base_currency = 'EUR'", name=op.f("ck_setting_base_currency_eur")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_setting")),
        sqlite_strict=True,
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
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_client_name_not_empty")),
        sa.CheckConstraint("kind IN ('individual', 'company')", name=op.f("ck_client_kind_enum")),
        sa.CheckConstraint("length(country_code) = 2", name=op.f("ck_client_country_code_length")),
        sa.CheckConstraint(
            f"siren IS NULL OR siren {SIREN_GLOB}", name=op.f("ck_client_siren_format")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_client")),
        sqlite_strict=True,
    )
    op.create_index("ix_client_archived_at", "client", ["archived_at", "name"], unique=False)

    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    op.execute(
        sa.text(
            "INSERT INTO setting (id, default_vat_bp, base_currency, created_at, updated_at) "
            "VALUES (1, 2000, 'EUR', :now, :now)"
        ).bindparams(now=now)
    )


def downgrade() -> None:
    op.drop_index("ix_client_archived_at", table_name="client")
    op.drop_table("client")
    op.drop_table("setting")
