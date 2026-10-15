"""fichiers d'article : catégorie « finition » (photo · finition · plan, classement manuel)

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-15

Ajout d'une valeur au CHECK `kind_enum` de `project_item_file` (ARCHITECTURE §5 : recréation
autorisée pour l'ajout d'une valeur à un CHECK, relue). SQLite ne modifie pas un CHECK : la table est
recréée à la main, à l'identique (STRICT, contraintes nommées, deux index), les lignes recopiées
telles quelles ; rien ne référence cette table. Écrite à la main, pas autogénérée (Alembic ne
compare pas les CHECK).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = (
    "id, project_item_id, file_id, kind, is_primary, caption, sort_order, created_at, updated_at"
)


def _recreate(kinds: str, kind_expression: str) -> None:
    op.execute(f"""
        CREATE TABLE project_item_file_new (
            id INTEGER NOT NULL,
            project_item_id INTEGER NOT NULL,
            file_id INTEGER NOT NULL,
            kind TEXT DEFAULT 'image' NOT NULL,
            is_primary INTEGER DEFAULT 0 NOT NULL,
            caption TEXT,
            sort_order INTEGER DEFAULT 0 NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CONSTRAINT pk_project_item_file PRIMARY KEY (id),
            CONSTRAINT ck_project_item_file_primary_is_image CHECK (is_primary = 0 OR kind = 'image'),
            CONSTRAINT ck_project_item_file_kind_enum CHECK (kind IN ({kinds})),
            CONSTRAINT ck_project_item_file_is_primary_bool CHECK (is_primary IN (0, 1)),
            CONSTRAINT fk_project_item_file_file_id_file FOREIGN KEY(file_id)
                REFERENCES file (id) ON DELETE RESTRICT,
            CONSTRAINT fk_project_item_file_project_item_id_project_item FOREIGN KEY(project_item_id)
                REFERENCES project_item (id) ON DELETE CASCADE,
            CONSTRAINT uq_project_item_file_project_item_id UNIQUE (project_item_id, file_id)
        ) STRICT
    """)
    select = COLUMNS.replace("kind,", f"{kind_expression},")
    op.execute(
        f"INSERT INTO project_item_file_new ({COLUMNS}) SELECT {select} FROM project_item_file"
    )
    op.execute("DROP TABLE project_item_file")
    op.execute("ALTER TABLE project_item_file_new RENAME TO project_item_file")
    op.execute("CREATE INDEX ix_project_item_file_file_id ON project_item_file (file_id)")
    op.execute(
        "CREATE UNIQUE INDEX uq_project_item_file_primary ON project_item_file (project_item_id) "
        "WHERE is_primary = 1"
    )


def upgrade() -> None:
    _recreate("'image', 'finish', 'drawing', 'other'", "kind")


def downgrade() -> None:
    # A finish goes back to a plain image (the v1 had no such category); no row is lost.
    _recreate(
        "'image', 'drawing', 'other'", "CASE kind WHEN 'finish' THEN 'image' ELSE kind END AS kind"
    )
