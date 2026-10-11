"""`po_sequence`: annual purchase-order numbering, never decremented (DATA_MODEL §4.23)."""

from sqlalchemy import CheckConstraint, Integer, text
from sqlalchemy.orm import Mapped, mapped_column

from ffe.models.base import STRICT, Base


class PoSequence(Base):
    __tablename__ = "po_sequence"
    __table_args__ = (
        CheckConstraint("year BETWEEN 2000 AND 2999", name="year_range"),
        CheckConstraint("next_value >= 1", name="next_value_min"),
        STRICT,
    )

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    next_value: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
