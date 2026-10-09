"""Declarative base: naming convention (required by Alembic batch mode) and STRICT tables."""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import Text

NAMING_CONVENTION = {
    "pk": "pk_%(table_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "ix": "ix_%(table_name)s_%(column_0_name)s",
}

# Last element of every model's `__table_args__` (DATA_MODEL §3: all tables STRICT).
STRICT = {"sqlite_strict": True}

# Only STRICT-compatible types are used: INTEGER (`Integer`) and TEXT (`Text`); never `String`.
DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampedMixin:
    """`created_at` / `updated_at` in ISO-8601 UTC, set by the service (no SQL default)."""

    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)
