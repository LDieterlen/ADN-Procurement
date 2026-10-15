"""options d'un article : rattachement à un article de base et lettre (ADR-0021)

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-15

Additive (ADR-0020) : deux colonnes nullables sur `project_item` et un index unique partiel. SQLite
n'ajoute pas de contrainte de table : la clé étrangère et les deux CHECK sont portés par les colonnes
ajoutées (`ADD COLUMN … CONSTRAINT …`), nommés comme le modèle. Lignes existantes : NULL partout
(aucun article n'est une option), donc les CHECK sont satisfaits. Écrite à la main, relue.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE project_item ADD COLUMN option_of_id INTEGER "
        "CONSTRAINT fk_project_item_option_of_id_project_item "
        "REFERENCES project_item (id) ON DELETE RESTRICT"
    )
    op.execute(
        "ALTER TABLE project_item ADD COLUMN option_letter TEXT "
        "CONSTRAINT ck_project_item_option_letter_format CHECK (option_letter GLOB '[A-Z]') "
        "CONSTRAINT ck_project_item_option_pair "
        "CHECK ((option_of_id IS NULL) = (option_letter IS NULL))"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_project_item_option ON project_item (option_of_id, option_letter) "
        "WHERE option_of_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX uq_project_item_option")
    op.execute("ALTER TABLE project_item DROP COLUMN option_letter")
    op.execute("ALTER TABLE project_item DROP COLUMN option_of_id")
