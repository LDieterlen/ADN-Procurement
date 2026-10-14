"""`capture`: a product page sent by the browser extension, waiting to become an article
(DATA_MODEL §4.16, ADR-0017). Global inbox: the project and the type are chosen in FFE.
`capture_image`: its photos, in page order (2026-10-14: every photo, not only the first)."""

from sqlalchemy import CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base
from ffe.models.file import File


class CaptureImage(Base):
    __tablename__ = "capture_image"
    __table_args__ = (
        UniqueConstraint("capture_id", "file_id", name="uq_capture_image_file"),
        CheckConstraint("sort_order >= 0", name="sort_order_min"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    capture_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("capture.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)

    file: Mapped[File] = relationship(File, lazy="joined", viewonly=True)


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
    # Every photo URL of the page, one per line (the extension sends those the server could not get).
    image_urls: Mapped[str | None] = mapped_column(Text)
    price_cents: Mapped[int | None] = mapped_column(Integer)
    currency: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    type_code: Mapped[str | None] = mapped_column(Text)  # guessed seed code, to be checked
    dimensions: Mapped[str | None] = mapped_column(Text)
    lead_time: Mapped[str | None] = mapped_column(Text)
    finish: Mapped[str | None] = mapped_column(Text)  # schema.org color / material
    source: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(Text, nullable=False)  # immutable: no updated_at

    images: Mapped[list[CaptureImage]] = relationship(
        CaptureImage, lazy="selectin", order_by=CaptureImage.sort_order, viewonly=True
    )
