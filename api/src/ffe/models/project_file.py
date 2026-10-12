"""`project_file`: every PDF issued for a project, kept as sent (DATA_MODEL §4.27, ADR-0009)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base
from ffe.models.file import File

EXPORT_KINDS = ("sheets_pdf", "list_pdf")


class ProjectFile(Base):
    __tablename__ = "project_file"
    __table_args__ = (
        CheckConstraint("kind IN ('sheets_pdf', 'list_pdf')", name="kind_enum"),
        Index("ix_project_file_project_id", "project_id"),
        Index("ix_project_file_file_id", "file_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    file_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    issued_at: Mapped[str] = mapped_column(Text, nullable=False)
    indice: Mapped[str | None] = mapped_column(Text)  # spec sheets: A, B, C… (ADR-0012)

    file: Mapped[File] = relationship(File, lazy="joined")
