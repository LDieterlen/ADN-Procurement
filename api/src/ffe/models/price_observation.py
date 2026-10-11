"""`price_observation`: a list price seen in an import, per product (DATA_MODEL §4.29)."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import DATE_GLOB, STRICT, Base


class PriceObservation(Base):
    __tablename__ = "price_observation"
    __table_args__ = (
        CheckConstraint("list_price_cents >= 0", name="price_min"),
        CheckConstraint("length(list_price_currency) = 3", name="currency_iso"),
        CheckConstraint("list_price_tax_mode IN ('ht', 'ttc')", name="tax_mode_enum"),
        CheckConstraint(f"observed_on {DATE_GLOB}", name="observed_on_date"),
        Index("ix_price_observation_product_id", "product_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    import_batch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("import_batch.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("product.id", ondelete="RESTRICT"), nullable=False
    )
    list_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    list_price_currency: Mapped[str] = mapped_column(Text, nullable=False)
    list_price_tax_mode: Mapped[str] = mapped_column(Text, nullable=False)
    observed_on: Mapped[str] = mapped_column(Text, nullable=False)
