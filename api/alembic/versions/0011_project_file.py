"""exports émis : project_file (étape F1, ADR-0009)

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-11

Écrite à la main d'après DATA_MODEL §4.27. Additive : un CREATE TABLE STRICT.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project_file",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("variant", sa.Text(), nullable=False),
        sa.Column("issued_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('schedule_xlsx', 'book_pdf')", name=op.f("ck_project_file_kind_enum")
        ),
        sa.CheckConstraint(
            "variant IN ('internal', 'client')", name=op.f("ck_project_file_variant_enum")
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_project_file_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"], ["file.id"], name=op.f("fk_project_file_file_id_file"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_file")),
        sqlite_strict=True,
    )
    op.create_index("ix_project_file_project_id", "project_file", ["project_id"], unique=False)
    op.create_index("ix_project_file_file_id", "project_file", ["file_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_project_file_file_id", table_name="project_file")
    op.drop_index("ix_project_file_project_id", table_name="project_file")
    op.drop_table("project_file")
