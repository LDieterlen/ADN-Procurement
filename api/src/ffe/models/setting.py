"""`setting`: single-row installation settings (DATA_MODEL §4.1)."""

from sqlalchemy import CheckConstraint, Integer, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin


class Setting(TimestampedMixin, Base):
    __tablename__ = "setting"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
        CheckConstraint("base_currency = 'EUR'", name="base_currency_eur"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    base_currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    # Version of the product-type seed applied by `ffe db seed`.
    seed_category_version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    # Prefix of generated project codes, e.g. 'P' → 'P2026-001'.
    project_code_prefix: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    # Agency identity, header of the PDF exports.
    agency_name: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    agency_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    agency_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    agency_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ADR-0017: shared secret of the browser extension (`X-FFE-Token`); None = extension disabled.
    extension_token: Mapped[str | None] = mapped_column(Text, nullable=True)
