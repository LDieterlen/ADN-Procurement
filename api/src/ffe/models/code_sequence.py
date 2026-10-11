"""`code_sequence`: next item number per project and category prefix; never decremented (DATA_MODEL §4.14)."""

from sqlalchemy import CheckConstraint, ForeignKey, Integer, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base


class CodeSequence(Base):
    __tablename__ = "code_sequence"
    __table_args__ = (
        CheckConstraint("length(prefix) BETWEEN 2 AND 4", name="prefix_length"),
        CheckConstraint("next_value >= 1", name="next_value_min"),
        STRICT,
    )

    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), primary_key=True
    )
    prefix: Mapped[str] = mapped_column(Text, primary_key=True)
    next_value: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
