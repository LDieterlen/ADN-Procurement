"""diffusions des fiches : table project_diffusion, indice par code (ADR-0022)

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-15

Additive (ADR-0020) : une table nouvelle et des colonnes nullables. `project_diffusion` (STRICT,
index unique partiel sur les diffusions vivantes) ; `project_item.first_diffusion_id`,
`project_item_placement.indice` et `diffused_item_id`, `project_file.diffusion_id`, les clés
étrangères portées par les colonnes ajoutées (comme 0003). Lignes existantes : NULL partout (aucune
diffusion faite). Les colonnes de l'indice déclaré (`project.indice`, `project_indice`…) restent,
inutilisées. Écrite à la main, relue.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project_diffusion",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("issued_at", sa.Text(), nullable=False),
        sa.Column("revoked_at", sa.Text(), nullable=True),
        sa.CheckConstraint("number >= 1", name=op.f("ck_project_diffusion_number_min")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_project_diffusion_project_id_project"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_diffusion")),
        sqlite_strict=True,
    )
    op.create_index(
        "uq_project_diffusion_number",
        "project_diffusion",
        ["project_id", "number"],
        unique=True,
        sqlite_where=sa.text("revoked_at IS NULL"),
    )
    op.execute(
        "ALTER TABLE project_item ADD COLUMN first_diffusion_id INTEGER "
        "CONSTRAINT fk_project_item_first_diffusion_id_project_diffusion "
        "REFERENCES project_diffusion (id) ON DELETE RESTRICT"
    )
    op.execute("ALTER TABLE project_item_placement ADD COLUMN indice TEXT")
    op.execute("ALTER TABLE project_item_placement ADD COLUMN diffused_item_id INTEGER")
    op.execute(
        "ALTER TABLE project_file ADD COLUMN diffusion_id INTEGER "
        "CONSTRAINT fk_project_file_diffusion_id_project_diffusion "
        "REFERENCES project_diffusion (id) ON DELETE RESTRICT"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE project_file DROP COLUMN diffusion_id")
    op.execute("ALTER TABLE project_item_placement DROP COLUMN diffused_item_id")
    op.execute("ALTER TABLE project_item_placement DROP COLUMN indice")
    op.execute("ALTER TABLE project_item DROP COLUMN first_diffusion_id")
    op.drop_index("uq_project_diffusion_number", table_name="project_diffusion")
    op.drop_table("project_diffusion")
