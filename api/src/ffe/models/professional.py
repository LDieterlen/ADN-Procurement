"""`professional`: the address book of makers, distributors, fabric publishers and artisans
(DATA_MODEL §4.6). Never linked to a product or an item: suppliers are (ADR-0015)."""

from sqlalchemy import CheckConstraint, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Professional(TimestampedMixin, Base):
    __tablename__ = "professional"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    # Code of a « prestation » value (`choice`), checked by the service.
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="manufacturer")
    specialty: Mapped[str | None] = mapped_column(Text)
    contact_name: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    mobile: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    contact2_name: Mapped[str | None] = mapped_column(Text)
    contact2_phone: Mapped[str | None] = mapped_column(Text)
    contact2_email: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)


# Last-resort net: the service compares normalised names (accents, spaces) before insert.
Index("uq_professional_name_lower", func.lower(Professional.name), unique=True)
