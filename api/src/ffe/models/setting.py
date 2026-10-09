"""`setting`: single-row installation settings (DATA_MODEL §4.1; step 3 columns only, D2.8)."""

from sqlalchemy import CheckConstraint, Integer, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Setting(TimestampedMixin, Base):
    __tablename__ = "setting"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
        CheckConstraint("default_vat_bp BETWEEN 0 AND 10000", name="default_vat_bp_range"),
        CheckConstraint("base_currency = 'EUR'", name="base_currency_eur"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    default_vat_bp: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("2000")
    )
    base_currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
