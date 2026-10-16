"""profils de listing : colonnes imprimées selon le destinataire (ADR-0023)

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-16

Additive (ADR-0020) : une table nouvelle `listing_profile`, remplie des cinq profils de départ
(copiés de `models/listing_profile.py` le 2026-10-16), ensuite modifiables. Écrite à la main, relue.
"""

import json
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ALL = (
    "photo", "code", "type", "name", "comments", "link", "reference", "supplier", "contact",
    "dimensions", "finish", "family", "usage", "lead_time", "quantity", "amount", "status", "indice",
)  # fmt: skip
DEFAULT_LISTING_PROFILES = (
    ("Complet", ALL),
    ("Client", ("photo", "code", "type", "name", "dimensions", "finish", "quantity", "status", "indice")),
    ("Installation", ("photo", "code", "type", "name", "comments", "reference", "supplier", "dimensions", "finish", "quantity", "indice")),
    ("Achats", ("code", "name", "link", "reference", "supplier", "contact", "dimensions", "finish", "lead_time", "quantity", "amount", "status")),
    ("Budget", ("code", "type", "name", "supplier", "family", "quantity", "amount", "status")),
)  # fmt: skip


def upgrade() -> None:
    op.create_table(
        "listing_profile",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("columns", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_listing_profile_name_not_empty")),
        sa.CheckConstraint(
            "json_valid(columns) AND json_type(columns) = 'array'",
            name=op.f("ck_listing_profile_columns_array"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_listing_profile")),
        sa.UniqueConstraint("name", name="uq_listing_profile_name"),
        sqlite_strict=True,
    )
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    for order, (name, columns) in enumerate(DEFAULT_LISTING_PROFILES):
        op.execute(
            sa.text(
                "INSERT INTO listing_profile (name, columns, sort_order, created_at, updated_at) "
                "VALUES (:name, :columns, :order, :now, :now)"
            ).bindparams(
                name=name, columns=json.dumps(list(columns)), order=(order + 1) * 10, now=now
            )
        )


def downgrade() -> None:
    op.drop_table("listing_profile")
