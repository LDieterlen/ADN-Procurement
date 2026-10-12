"""`item_code_sequence`: next item number per project, zone code and typology prefix; never
decremented (DATA_MODEL §4.14, ADR-0012). `zone_code = ''` for lines placed in no zone."""

from sqlalchemy import CheckConstraint, ForeignKey, Integer, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base


class ItemCodeSequence(Base):
    __tablename__ = "item_code_sequence"
    __table_args__ = (
        CheckConstraint("length(prefix) BETWEEN 2 AND 4", name="prefix_length"),
        CheckConstraint("next_value >= 1", name="next_value_min"),
        STRICT,
    )

    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), primary_key=True
    )
    zone_code: Mapped[str] = mapped_column(Text, primary_key=True)
    prefix: Mapped[str] = mapped_column(Text, primary_key=True)
    next_value: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
