"""index sur chaque clé étrangère restée sans index (règle DATA_MODEL §3, audit du 2026-10-16)

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-16

Additive (ADR-0020) : sept index, aucune ligne touchée. Écrite à la main, relue.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

INDEXES = (
    ("ix_setting_agency_logo_file_id", "setting", "agency_logo_file_id"),
    ("ix_project_procurement_logo_file_id", "project", "procurement_logo_file_id"),
    ("ix_project_item_first_diffusion_id", "project_item", "first_diffusion_id"),
    ("ix_project_file_diffusion_id", "project_file", "diffusion_id"),
    ("ix_installation_plan_file_id", "installation_plan", "file_id"),
    ("ix_installation_plan_source_file_id", "installation_plan", "source_file_id"),
    ("ix_installation_sheet_plan_id", "installation_sheet", "plan_id"),
)


def upgrade() -> None:
    for name, table, column in INDEXES:
        op.create_index(name, table, [column])


def downgrade() -> None:
    for name, table, _column in INDEXES:
        op.drop_index(name, table_name=table)
