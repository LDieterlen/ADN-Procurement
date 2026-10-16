"""`project_item_placement`: where a line goes, how many, and its FF&E code `<LOC>-<TYPE>-NN`
(DATA_MODEL §4.12, ADR-0018)."""

from sqlalchemy import (
    CheckConstraint,
    ForeignKeyConstraint,
    Index,
    Integer,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base
from ffe.models.location import Location


def next_letter(current: str | None) -> str:
    """« - » → A, then B … Z, AA, AB … (Excel-style)."""
    if not current:
        return "A"
    digits = [ord(ch) - 65 for ch in current]
    i = len(digits) - 1
    while i >= 0:
        if digits[i] < 25:
            digits[i] += 1
            return "".join(chr(65 + d) for d in digits)
        digits[i] = 0
        i -= 1
    return "A" + "".join(chr(65 + d) for d in digits)


class ProjectItemPlacement(Base):
    __tablename__ = "project_item_placement"
    __table_args__ = (
        # Composite foreign keys: a placement can never cross projects (DATA_MODEL §3).
        ForeignKeyConstraint(
            ["project_item_id", "project_id"],
            ["project_item.id", "project_item.project_id"],
            name="fk_project_item_placement_project_item_id_project_item",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["location_id", "project_id"],
            ["location.id", "location.project_id"],
            name="fk_project_item_placement_location_id_location",
            ondelete="RESTRICT",
        ),
        CheckConstraint("qty_milli >= 0", name="qty_min"),
        CheckConstraint("length(code) > 0", name="code_not_empty"),
        UniqueConstraint("project_id", "code", name="uq_project_item_placement_code"),
        Index("ix_project_item_placement_project_id", "project_id", "location_id", "sort_order"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, nullable=False)
    location_id: Mapped[int | None] = mapped_column(Integer)  # NULL = « non affecté »
    code: Mapped[str] = mapped_column(Text, nullable=False)  # `<LOC>-<TYPE>-NN` (ADR-0018)
    # ADR-0022 (migration 0005): the code's own indice (NULL = « - »), and the article it showed at
    # the last diffusion (NULL = never diffused). A different article now = the product changed
    # (an option retained): the indice moves at the next diffusion.
    indice: Mapped[str | None] = mapped_column(Text)
    diffused_item_id: Mapped[int | None] = mapped_column(Integer)

    @property
    def diffused(self) -> bool:
        """Shown in a diffusion: its code never moves nor disappears (ADR-0022)."""
        return self.diffused_item_id is not None

    def coming_indice(self, item_id: int) -> str | None:
        """The indice this code takes at the next diffusion when it shows article `item_id`
        (ADR-0022, 2026-10-16): a code shown for the first time starts without indice (« - »);
        the next letter when its product changed (an option retained); else unchanged."""
        if self.diffused_item_id is not None and self.diffused_item_id != item_id:
            return next_letter(self.indice)
        return self.indice

    def coming_change(self, item_id: int, diffusion_number: int) -> str | None:
        """What diffusion `diffusion_number` brings to this code, marked on the sheets: « new » (a
        code never diffused, from the second diffusion on), « revised » (its product changed)."""
        if self.diffused_item_id is None:
            return "new" if diffusion_number > 1 else None
        if self.diffused_item_id != item_id:
            return "revised"
        return None

    qty_milli: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1000"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)


# One placement per (line, location), NULL location included (expression index, hand-written).
Index(
    "uq_project_item_placement_location",
    ProjectItemPlacement.project_item_id,
    func.coalesce(ProjectItemPlacement.location_id, 0),
    unique=True,
)

__all__ = ["Location", "ProjectItemPlacement"]
