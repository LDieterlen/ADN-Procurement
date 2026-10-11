"""note de licence sur file (étape F2, ADR-0010)

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-11

Additive : un ADD COLUMN nullable sur `file`.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE file ADD COLUMN license_note TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE file DROP COLUMN license_note")
