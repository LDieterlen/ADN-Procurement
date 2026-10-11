"""réglages : identité de l'agence sur `setting` (étape 9)

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-11

Écrite à la main d'après DATA_MODEL §4.1 (D2.8). Additive : six ADD COLUMN sur la ligne unique
de `setting`, un NOT NULL avec défaut vide, cinq nullables ; le SIRET est contrôlé par un CHECK
posé avec la colonne (autorisé par SQLite tant que les lignes existantes le respectent : NULL).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SIRET_GLOB = "[0-9]" * 14


def upgrade() -> None:
    op.execute("ALTER TABLE setting ADD COLUMN agency_name TEXT NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE setting ADD COLUMN agency_address TEXT")
    op.execute("ALTER TABLE setting ADD COLUMN agency_email TEXT")
    op.execute("ALTER TABLE setting ADD COLUMN agency_phone TEXT")
    op.execute(
        "ALTER TABLE setting ADD COLUMN agency_siret TEXT "
        f"CONSTRAINT ck_setting_agency_siret_format "
        f"CHECK (agency_siret IS NULL OR agency_siret GLOB '{SIRET_GLOB}')"
    )
    op.execute("ALTER TABLE setting ADD COLUMN agency_vat_number TEXT")


def downgrade() -> None:
    for column in (
        "agency_vat_number",
        "agency_siret",
        "agency_phone",
        "agency_email",
        "agency_address",
        "agency_name",
    ):
        op.execute(f"ALTER TABLE setting DROP COLUMN {column}")
