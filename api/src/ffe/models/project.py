"""`project`: the container of all work; no archiving, `closed`/`cancelled` play that role (DATA_MODEL §4.3)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base, TimestampedMixin
from ffe.models.project_diffusion import ProjectDiffusion

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
        Index("ix_project_procurement_logo_file_id", "procurement_logo_file_id"),
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
    # Diffusion letter declared by the user (A, B, C…), never by an export (2026-10-13): the sheets
    # changed since the previous declaration take it. NULL = nothing diffused yet.
    indice: Mapped[str | None] = mapped_column(Text)
    indice_changed_at: Mapped[str | None] = mapped_column(Text)
    # The procurement company the project is run for, printed at the top right of the sheets with
    # its logo (an independent works for several; migration 0004, 2026-10-15). ON DELETE RESTRICT
    # is in the migration (SQLite does not reflect the options of a column-level foreign key).
    procurement_name: Mapped[str | None] = mapped_column(Text)
    procurement_logo_file_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("file.id"))

    diffusions: Mapped[list[ProjectDiffusion]] = relationship(
        ProjectDiffusion, order_by=ProjectDiffusion.number, lazy="selectin", viewonly=True
    )

    @property
    def diffusion_count(self) -> int:
        """Official diffusions not cancelled (ADR-0022): 0 = everything still free."""
        return sum(1 for d in self.diffusions if d.revoked_at is None)

    @property
    def last_diffusion(self) -> ProjectDiffusion | None:
        live = [d for d in self.diffusions if d.revoked_at is None]
        return live[-1] if live else None
