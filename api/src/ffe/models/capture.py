"""`capture`: a product page sent by the browser extension, waiting to become an article
(DATA_MODEL §4.16, ADR-0017). Global inbox: the project and the type are chosen in FFE."""

from sqlalchemy import CheckConstraint, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base
from ffe.models.file import File


class Capture(Base):
    __tablename__ = "capture"
    __table_args__ = (
        CheckConstraint("length(url) > 0", name="url_not_empty"),
        CheckConstraint("price_cents IS NULL OR price_cents >= 0", name="price_cents_min"),
        CheckConstraint("source IN ('json-ld','opengraph','title')", name="source_values"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(Text)
    reference: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    price_cents: Mapped[int | None] = mapped_column(Integer)
    currency: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    image_file_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT")
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False)  # immutable: no updated_at

    image: Mapped[File | None] = relationship(File, lazy="joined", viewonly=True)
