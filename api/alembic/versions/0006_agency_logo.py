"""logo de l'agence (réglages), imprimé en haut à gauche des fiches

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-16

Additive (ADR-0020) : une colonne nullable sur `setting`, clé étrangère vers `file` portée par la
colonne ajoutée (`ADD COLUMN … REFERENCES … ON DELETE RESTRICT`), comme en 0004. Ligne existante :
NULL (aucun logo déposé). Écrite à la main, relue.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE setting ADD COLUMN agency_logo_file_id INTEGER "
        "CONSTRAINT fk_setting_agency_logo_file_id_file "
        "REFERENCES file (id) ON DELETE RESTRICT"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE setting DROP COLUMN agency_logo_file_id")
