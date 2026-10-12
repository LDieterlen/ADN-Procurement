"""`project`: the container of all work; no archiving, `closed`/`cancelled` play that role (DATA_MODEL §4.3)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin

PROJECT_STATUSES = ("prospect", "active", "delivered", "closed", "cancelled")
PROJECT_STATUSES_SQL = ", ".join(f"'{s}'" for s in PROJECT_STATUSES)
# Read-only statuses: edits of the project and its content are refused (409) until reopened.
PROJECT_CLOSED_STATUSES = ("closed", "cancelled")


class Project(TimestampedMixin, Base):
    __tablename__ = "project"
    __table_args__ = (
        CheckConstraint("length(code) > 0", name="code_not_empty"),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint(f"status IN ({PROJECT_STATUSES_SQL})", name="status_enum"),
        CheckConstraint(f"due_on IS NULL OR due_on {DATE_GLOB}", name="due_on_date"),
        Index("ix_project_client_id", "client_id"),
        Index("ix_project_status", "status"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    client_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("client.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="prospect")
    site_address: Mapped[str | None] = mapped_column(Text)
    due_on: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
