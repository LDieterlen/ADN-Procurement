"""`quote_file`: the PDF(s) of a quote (DATA_MODEL §4.19)."""

from sqlalchemy import ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin
from ffe.models.file import File


class QuoteFile(TimestampedMixin, Base):
    __tablename__ = "quote_file"
    __table_args__ = (
        UniqueConstraint("quote_id", "file_id", name="uq_quote_file_quote_id"),
        Index("ix_quote_file_file_id", "file_id"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quote_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quote.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("file.id", ondelete="RESTRICT"), nullable=False
    )
    caption: Mapped[str | None] = mapped_column(Text)

    file: Mapped[File] = relationship(File, lazy="joined")
