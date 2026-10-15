"""`choice`: editable value lists (DATA_MODEL §4.18, 2026-10-14): article families and usages,
professional prestations. Rows store a stable `code` (what other tables keep) and an editable
`name`. Statuses stay fixed: they drive the budget computations."""

from sqlalchemy import CheckConstraint, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base, TimestampedMixin

# Values present from the start (inserted by the migration, then freely edited).
DEFAULT_CHOICES: dict[str, tuple[tuple[str, str], ...]] = {
    "family": (
        ("custom", "Pièce sur-mesure"),
        ("joinery", "Agencement"),
        ("ose", "OS&E"),
        ("edition", "Pièce d'édition"),
        ("gallery", "Pièce de galerie"),
        ("artwork", "Œuvre d'art"),
        ("textile", "Confection"),
    ),
    "usage": (("indoor", "Intérieur"), ("outdoor", "Extérieur")),
    "prestation": (
        ("manufacturer", "Fabricant"),
        ("distributor", "Distributeur"),
        ("publisher", "Éditeur"),
        ("artisan", "Artisan"),
    ),
}


class Choice(TimestampedMixin, Base):
    __tablename__ = "choice"
    __table_args__ = (
        CheckConstraint("list IN ('family','usage','prestation')", name="list_values"),
        CheckConstraint("length(code) > 0", name="code_not_empty"),
        CheckConstraint("length(name) > 0", name="name_not_empty"),
        UniqueConstraint("list", "code", name="uq_choice_list_code"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    list: Mapped[str] = mapped_column(Text, nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)  # immutable once created
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    archived_at: Mapped[str | None] = mapped_column(Text)
