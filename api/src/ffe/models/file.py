"""`file`: a physical file deduplicated by sha256, stored as `files/<sha256>.<ext>` (DATA_MODEL §4.9)."""

from sqlalchemy import CheckConstraint, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base


class File(Base):
    __tablename__ = "file"
    __table_args__ = (
        CheckConstraint("length(sha256) = 64", name="sha256_length"),
        CheckConstraint("length(ext) BETWEEN 1 AND 10", name="ext_length"),
        CheckConstraint("size_bytes >= 0", name="size_bytes_min"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sha256: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    ext: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(Text, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    original_name: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text, nullable=False)  # immutable: no updated_at

    @property
    def filename(self) -> str:
        return f"{self.sha256}.{self.ext}"
