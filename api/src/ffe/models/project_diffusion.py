"""`project_diffusion`: one row per official diffusion of a project's spec sheets (ADR-0022). The
first one carries no indice and freezes the codes; each later one moves the indice of the codes
whose product changed. The last one can be taken back (`revoked_at`): its row stays, so the PDFs
issued with it remain in the history, marked as cancelled."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base


class ProjectDiffusion(Base):
    __tablename__ = "project_diffusion"
    __table_args__ = (
        CheckConstraint("number >= 1", name="number_min"),
        # One live diffusion per number; a cancelled one may share it (partial index).
        Index(
            "uq_project_diffusion_number",
            "project_id",
            "number",
            unique=True,
            sqlite_where=text("revoked_at IS NULL"),
        ),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), nullable=False
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    issued_at: Mapped[str] = mapped_column(Text, nullable=False)
    revoked_at: Mapped[str | None] = mapped_column(Text)
