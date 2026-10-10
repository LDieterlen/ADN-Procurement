"""`manufacturer`: the brand that makes a product, distinct from the supplier (DATA_MODEL §4.6)."""

from sqlalchemy import CheckConstraint, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Manufacturer(TimestampedMixin, Base):
    __tablename__ = "manufacturer"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    website: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)


# Last-resort net: the service compares normalised names (accents, spaces) before insert.
Index("uq_manufacturer_name_lower", func.lower(Manufacturer.name), unique=True)
