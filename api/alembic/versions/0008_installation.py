"""planches d'installation : plans du projet, planches par pièce, articles autour du plan (ADR-0024)

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-16

Additive (ADR-0020) : trois tables nouvelles, vides (`installation_plan`, `installation_sheet`,
`installation_sheet_item`) ; aucune table existante touchée. Retouchée avant publication
(2026-10-16) : disposition, rotation du plan, position par case (cases vides) ; puis repères numérotés sur le plan
(`installation_sheet_marker`) et couleurs par type (`color_by_type`). Écrite à la main, relue.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "installation_plan",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("source_file_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_installation_plan_name_not_empty")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_installation_plan_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["file.id"],
            name=op.f("fk_installation_plan_file_id_file"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["source_file_id"],
            ["file.id"],
            name=op.f("fk_installation_plan_source_file_id_file"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_installation_plan")),
        sa.UniqueConstraint("id", "project_id", name="uq_installation_plan_id"),
        sqlite_strict=True,
    )
    op.create_index("ix_installation_plan_project_id", "installation_plan", ["project_id"])
    op.create_table(
        "installation_sheet",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("per_page", sa.Integer(), nullable=False),
        sa.Column("arrangement", sa.Text(), nullable=False),
        sa.Column("plan_rotation", sa.Integer(), nullable=False),
        sa.Column("color_by_type", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.CheckConstraint("length(name) > 0", name=op.f("ck_installation_sheet_name_not_empty")),
        sa.CheckConstraint(
            "per_page IN (8, 12, 16)", name=op.f("ck_installation_sheet_per_page_valid")
        ),
        sa.CheckConstraint(
            "arrangement IN ('ring', 'sides', 'ends', 'right')",
            name=op.f("ck_installation_sheet_arrangement_valid"),
        ),
        sa.CheckConstraint(
            "plan_rotation IN (0, 90, 180, 270)",
            name=op.f("ck_installation_sheet_plan_rotation_valid"),
        ),
        sa.CheckConstraint(
            "color_by_type IN (0, 1)", name=op.f("ck_installation_sheet_color_by_type_bool")
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name=op.f("fk_installation_sheet_project_id_project"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["location_id", "project_id"],
            ["location.id", "location.project_id"],
            name="fk_installation_sheet_location_id_location",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["plan_id", "project_id"],
            ["installation_plan.id", "installation_plan.project_id"],
            name="fk_installation_sheet_plan_id_installation_plan",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_installation_sheet")),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_installation_sheet_project_id",
        "installation_sheet",
        ["project_id", "location_id", "sort_order"],
    )
    op.create_table(
        "installation_sheet_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sheet_id", sa.Integer(), nullable=False),
        sa.Column("placement_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint("position >= 0", name=op.f("ck_installation_sheet_item_position_min")),
        sa.ForeignKeyConstraint(
            ["sheet_id"],
            ["installation_sheet.id"],
            name=op.f("fk_installation_sheet_item_sheet_id_installation_sheet"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["placement_id"],
            ["project_item_placement.id"],
            name=op.f("fk_installation_sheet_item_placement_id_project_item_placement"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_installation_sheet_item")),
        sa.UniqueConstraint(
            "sheet_id", "placement_id", name="uq_installation_sheet_item_placement"
        ),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_installation_sheet_item_placement_id", "installation_sheet_item", ["placement_id"]
    )
    op.create_table(
        "installation_sheet_marker",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sheet_item_id", sa.Integer(), nullable=False),
        sa.Column("x_permille", sa.Integer(), nullable=False),
        sa.Column("y_permille", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "x_permille BETWEEN 0 AND 1000", name=op.f("ck_installation_sheet_marker_x_range")
        ),
        sa.CheckConstraint(
            "y_permille BETWEEN 0 AND 1000", name=op.f("ck_installation_sheet_marker_y_range")
        ),
        sa.ForeignKeyConstraint(
            ["sheet_item_id"],
            ["installation_sheet_item.id"],
            name=op.f("fk_installation_sheet_marker_sheet_item_id_installation_sheet_item"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_installation_sheet_marker")),
        sqlite_strict=True,
    )
    op.create_index(
        "ix_installation_sheet_marker_sheet_item_id",
        "installation_sheet_marker",
        ["sheet_item_id"],
    )


def downgrade() -> None:
    op.drop_table("installation_sheet_marker")
    op.drop_table("installation_sheet_item")
    op.drop_table("installation_sheet")
    op.drop_table("installation_plan")
