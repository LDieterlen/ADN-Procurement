"""société de procurement du projet : nom et logo, imprimés en haut à droite des fiches

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-15

Additive (ADR-0020) : deux colonnes nullables sur `project`. La clé étrangère du logo vers `file`
est portée par la colonne ajoutée (`ADD COLUMN … REFERENCES … ON DELETE RESTRICT`), comme en 0003.
Lignes existantes : NULL (aucune société saisie). Écrite à la main, relue.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE project ADD COLUMN procurement_name TEXT")
    op.execute(
        "ALTER TABLE project ADD COLUMN procurement_logo_file_id INTEGER "
        "CONSTRAINT fk_project_procurement_logo_file_id_file "
        "REFERENCES file (id) ON DELETE RESTRICT"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE project DROP COLUMN procurement_logo_file_id")
    op.execute("ALTER TABLE project DROP COLUMN procurement_name")
