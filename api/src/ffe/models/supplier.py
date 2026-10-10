"""`supplier`: who sells and invoices (DATA_MODEL §4.7). Only `name` is required; no executives, ever."""

from sqlalchemy import CheckConstraint, Index, Integer, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin
from ffe.models.client import SIREN_GLOB

SIRET_GLOB = "GLOB '" + "[0-9]" * 14 + "'"


class Supplier(TimestampedMixin, Base):
    __tablename__ = "supplier"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        CheckConstraint("length(country_code) = 2", name="country_code_length"),
        CheckConstraint(f"siren IS NULL OR siren {SIREN_GLOB}", name="siren_format"),
        CheckConstraint(
            f"siret IS NULL OR (siret {SIRET_GLOB} AND (siren IS NULL OR substr(siret, 1, 9) = siren))",
            name="siret_format",
        ),
        CheckConstraint("length(currency) = 3", name="currency_length"),
        CheckConstraint(
            "default_discount_bp BETWEEN 0 AND 10000", name="default_discount_bp_range"
        ),
        Index("ix_supplier_archived_at", "archived_at", "name"),
        Index("ix_supplier_siren", "siren"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    legal_name: Mapped[str | None] = mapped_column(Text)
    country_code: Mapped[str] = mapped_column(Text, nullable=False, server_default="FR")
    siren: Mapped[str | None] = mapped_column(Text)
    siret: Mapped[str | None] = mapped_column(Text)
    vat_number: Mapped[str | None] = mapped_column(Text)
    address_line1: Mapped[str | None] = mapped_column(Text)
    address_line2: Mapped[str | None] = mapped_column(Text)
    postal_code: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    contact_name: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="EUR")
    default_discount_bp: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    payment_terms: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[str | None] = mapped_column(Text)


Index("uq_supplier_siret", Supplier.siret, unique=True, sqlite_where=Supplier.siret.is_not(None))
