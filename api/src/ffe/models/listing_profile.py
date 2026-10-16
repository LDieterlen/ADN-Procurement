"""`listing_profile`: which columns a listing prints, by recipient (ADR-0023, migration 0007).
Rows start with five defaults inserted by the migration, then are freely edited."""

from sqlalchemy import CheckConstraint, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class ListingProfile(TimestampedMixin, Base):
    __tablename__ = "listing_profile"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint(
            "json_valid(columns) AND json_type(columns) = 'array'", name="columns_array"
        ),
        UniqueConstraint("name", name="uq_listing_profile_name"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    columns: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array of column keys
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
