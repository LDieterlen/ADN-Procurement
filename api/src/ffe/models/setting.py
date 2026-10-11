"""`setting`: single-row installation settings (DATA_MODEL §4.1; columns added per step, D2.8)."""

from sqlalchemy import CheckConstraint, Integer, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin

SIRET_GLOB = "[0-9]" * 14


class Setting(TimestampedMixin, Base):
    __tablename__ = "setting"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
        CheckConstraint("default_vat_bp BETWEEN 0 AND 10000", name="default_vat_bp_range"),
        CheckConstraint("base_currency = 'EUR'", name="base_currency_eur"),
        CheckConstraint(
            f"agency_siret IS NULL OR agency_siret GLOB '{SIRET_GLOB}'",
            name="agency_siret_format",
        ),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    default_vat_bp: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("2000")
    )
    base_currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    # Step 6a (migration 0002): version of the category seed applied by `ffe db seed`.
    seed_category_version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    # Step 6c (migration 0004): prefix of generated project codes, e.g. 'P' → 'P2026-001'.
    project_code_prefix: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    # Step 8 (migration 0006): contingency copied onto new projects.
    default_contingency_bp: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1000")
    )
    # Step 9 (migration 0007): agency identity, header of the future exports.
    agency_name: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    agency_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    agency_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    agency_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    agency_siret: Mapped[str | None] = mapped_column(Text, nullable=True)
    agency_vat_number: Mapped[str | None] = mapped_column(Text, nullable=True)
