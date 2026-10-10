"""projets et zones : project, zone ; setting.project_code_prefix (étape 6c)

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-10

Écrite à la main d'après DATA_MODEL §4.3, §4.4 et §4.1 (D2.8). Additive : deux CREATE TABLE STRICT,
leurs index et contraintes UNIQUE (dont `uq_zone_id (id, project_id)`, cible des FK composites de 7a),
un ADD COLUMN avec défaut sur `setting`.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"


def upgrade() -> None:
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
        sa.Column("start_on", sa.Text(), nullable=True),
        sa.Column("due_on", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(code) > 0", name=op.f("ck_project_code_not_empty")),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_project_name_not_empty")),
        sa.CheckConstraint(
            "status IN ('prospect', 'active', 'delivered', 'closed', 'cancelled')",
            name=op.f("ck_project_status_enum"),
        ),
        sa.CheckConstraint(
            "default_vat_bp BETWEEN 0 AND 10000", name=op.f("ck_project_default_vat_bp_range")
        ),
        sa.CheckConstraint(
            f"start_on IS NULL OR start_on {DATE_GLOB}", name=op.f("ck_project_start_on_date")
        ),
        sa.CheckConstraint(
            f"due_on IS NULL OR due_on {DATE_GLOB}", name=op.f("ck_project_due_on_date")
        ),
        sa.CheckConstraint(
            "due_on IS NULL OR start_on IS NULL OR due_on >= start_on",
            name=op.f("ck_project_due_after_start"),
        ),
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
    op.create_index("ix_project_client_id", "project", ["client_id"], unique=False)
    op.create_index("ix_project_status", "project", ["status"], unique=False)

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
        sa.UniqueConstraint("project_id", "code", name="uq_zone_project_id"),
        sa.UniqueConstraint("id", "project_id", name="uq_zone_id"),
        sqlite_strict=True,
    )
    op.create_index("ix_zone_project_id", "zone", ["project_id", "sort_order"], unique=False)

    op.execute("ALTER TABLE setting ADD COLUMN project_code_prefix TEXT NOT NULL DEFAULT ''")


def downgrade() -> None:
    op.execute("ALTER TABLE setting DROP COLUMN project_code_prefix")
    op.drop_index("ix_zone_project_id", table_name="zone")
    op.drop_table("zone")
    op.drop_index("ix_project_status", table_name="project")
    op.drop_index("ix_project_client_id", table_name="project")
    op.drop_table("project")
