"""`installation_plan`: a floor plan of the project, drawn in the middle of the installation
sheets (ADR-0024, migration 0008). A PDF plan is kept as `source_file_id`, its first page
rendered once to an image (`file_id`)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class InstallationPlan(TimestampedMixin, Base):
    __tablename__ = "installation_plan"
    __table_args__ = (
        # Target of the composite foreign key of `installation_sheet`: never another project's plan.
        UniqueConstraint("id", "project_id", name="uq_installation_plan_id"),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        Index("ix_installation_plan_project_id", "project_id"),
        Index("ix_installation_plan_source_file_id", "source_file_id"),
        Index("ix_installation_plan_file_id", "file_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    file_id: Mapped[int] = mapped_column(  # the image drawn (PNG, JPEG, WebP)
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    source_file_id: Mapped[int | None] = mapped_column(  # the uploaded PDF, when it was one
        Integer, ForeignKey("file.id", ondelete="RESTRICT")
    )
