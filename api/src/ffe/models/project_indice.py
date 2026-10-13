"""`project_indice`: one row per diffusion letter declared on a project (DATA_MODEL §4.17), so the
last declaration can be taken back (a wrong click) and the previous one restored."""

from sqlalchemy import CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base


class ProjectIndice(Base):
    __tablename__ = "project_indice"
    __table_args__ = (
        CheckConstraint("length(indice) > 0", name="indice_not_empty"),
        UniqueConstraint("project_id", "indice", name="uq_project_indice_letter"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), nullable=False
    )
    indice: Mapped[str] = mapped_column(Text, nullable=False)
    declared_at: Mapped[str] = mapped_column(Text, nullable=False)
