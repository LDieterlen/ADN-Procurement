"""`client`: the ordering party of projects (DATA_MODEL §4.2). Template of every resource."""

from sqlalchemy import CheckConstraint, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin

SIREN_GLOB = "GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'"


class Client(TimestampedMixin, Base):
    __tablename__ = "client"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("kind IN ('individual', 'company')", name="kind_enum"),
        CheckConstraint("length(country_code) = 2", name="country_code_length"),
        CheckConstraint(f"siren IS NULL OR siren {SIREN_GLOB}", name="siren_format"),
        Index("ix_client_archived_at", "archived_at", "name"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="individual")
    contact_name: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    address_line1: Mapped[str | None] = mapped_column(Text)
    address_line2: Mapped[str | None] = mapped_column(Text)
    postal_code: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    country_code: Mapped[str] = mapped_column(Text, nullable=False, server_default="FR")
    siren: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)
