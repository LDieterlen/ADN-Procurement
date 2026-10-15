"""`project_item_event`: append-only journal of a line, written in the same transaction (DATA_MODEL §4.13).

No CHECK on `kind`: adding an event type never recreates the table.
"""

from sqlalchemy import ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from ffe.models.base import STRICT, Base


class ProjectItemEvent(Base):
    __tablename__ = "project_item_event"
    __table_args__ = (
        Index("ix_project_item_event_project_item_id", "project_item_id", "changed_at"),
        STRICT,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project_item.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    from_status: Mapped[str | None] = mapped_column(Text)
    to_status: Mapped[str | None] = mapped_column(Text)
    old_value: Mapped[str | None] = mapped_column(Text)  # compact JSON
    new_value: Mapped[str | None] = mapped_column(Text)
    changed_at: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
