"""`supplier`: who sells, with the contacts printed on the spec sheets (DATA_MODEL §4.7, ADR-0015).
Only `name` is required; no executives, ever."""

from sqlalchemy import CheckConstraint, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Supplier(TimestampedMixin, Base):
    __tablename__ = "supplier"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("length(currency) = 3", name="currency_length"),
        Index("ix_supplier_archived_at", "archived_at", "name"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    specialty: Mapped[str | None] = mapped_column(Text)
    contact_name: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    mobile: Mapped[str | None] = mapped_column(Text)
    contact2_name: Mapped[str | None] = mapped_column(Text)
    contact2_phone: Mapped[str | None] = mapped_column(Text)
    contact2_email: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)
