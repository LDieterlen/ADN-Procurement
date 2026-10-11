"""budgets : budget_line ; project.contingency_bp ; setting.default_contingency_bp (étape 8)

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-11

Écrite à la main d'après DATA_MODEL §4.16, §4.3 et §4.1 (D2.6, D2.8). Additive : un CREATE TABLE
STRICT avec son index d'expression (un seul budget par périmètre), deux ADD COLUMN avec défaut ;
les projets existants reçoivent la contingence par défaut du réglage.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "budget_line",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("zone_id", sa.Integer(), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("amount_cents >= 0", name=op.f("ck_budget_line_amount_min")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_budget_line_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            name=op.f("fk_budget_line_category_id_category"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["zone_id", "project_id"],
            ["zone.id", "zone.project_id"],
            name="fk_budget_line_zone_id_zone",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_budget_line")),
        sqlite_strict=True,
    )
    op.create_index("ix_budget_line_project_id", "budget_line", ["project_id"], unique=False)
    op.execute(
        "CREATE UNIQUE INDEX uq_budget_line_scope ON budget_line "
        "(project_id, COALESCE(zone_id, 0), COALESCE(category_id, 0))"
    )
    op.execute(
        "ALTER TABLE setting ADD COLUMN default_contingency_bp INTEGER NOT NULL DEFAULT 1000"
    )
    op.execute("ALTER TABLE project ADD COLUMN contingency_bp INTEGER NOT NULL DEFAULT 0")
    op.execute(
        "UPDATE project SET contingency_bp = (SELECT default_contingency_bp FROM setting WHERE id = 1)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE project DROP COLUMN contingency_bp")
    op.execute("ALTER TABLE setting DROP COLUMN default_contingency_bp")
    op.execute("DROP INDEX uq_budget_line_scope")
    op.drop_index("ix_budget_line_project_id", table_name="budget_line")
    op.drop_table("budget_line")
