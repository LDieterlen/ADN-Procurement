"""Engine factory: pragmas on every connection, SQLite version check, integrity helpers."""

import sqlite3
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.exc import DatabaseError

from ffe.db import DbError

MIN_SQLITE_VERSION = (3, 37, 0)  # STRICT tables

# Applied on every new connection (ARCHITECTURE §5, master).
PRAGMAS: tuple[tuple[str, str], ...] = (
    ("journal_mode", "WAL"),
    ("synchronous", "FULL"),
    ("foreign_keys", "ON"),
    ("busy_timeout", "5000"),
    ("trusted_schema", "OFF"),
)


def check_sqlite_version() -> None:
    if sqlite3.sqlite_version_info < MIN_SQLITE_VERSION:
        raise DbError(
            f"SQLite {sqlite3.sqlite_version} trop ancien : "
            f"{'.'.join(map(str, MIN_SQLITE_VERSION))} minimum (tables STRICT)."
        )


def create_db_engine(db_path: Path) -> Engine:
    check_sqlite_version()
    engine = create_engine(f"sqlite+pysqlite:///{db_path}")

    @event.listens_for(engine, "connect")
    def _apply_pragmas(dbapi_connection: Any, _record: Any) -> None:
        cursor = dbapi_connection.cursor()
        for name, value in PRAGMAS:
            cursor.execute(f"PRAGMA {name}={value}")
        cursor.close()

    return engine


def quick_check(engine: Engine) -> str:
    """Returns 'ok' or the first problem reported by SQLite (including 'file is not a database')."""
    try:
        with engine.connect() as conn:
            rows = conn.exec_driver_sql("PRAGMA quick_check").fetchall()
    except DatabaseError as error:
        return str(error.orig) if error.orig is not None else str(error)
    return str(rows[0][0]) if rows else "ok"


def integrity_check(engine: Engine) -> str:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql("PRAGMA integrity_check").fetchall()
    return str(rows[0][0]) if rows else "ok"


def foreign_key_check(engine: Engine) -> list[tuple[Any, ...]]:
    """Empty list = every foreign key is satisfied."""
    with engine.connect() as conn:
        return [tuple(row) for row in conn.exec_driver_sql("PRAGMA foreign_key_check").fetchall()]


def table_strictness(engine: Engine) -> dict[str, bool]:
    """Table name → whether its DDL carries the STRICT keyword (read from sqlite_master.sql)."""
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT name, sql FROM sqlite_master WHERE type = 'table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
    return {str(name): str(sql).rstrip().upper().endswith("STRICT") for name, sql in rows}


def row_counts(engine: Engine) -> dict[str, int]:
    counts: dict[str, int] = {}
    with engine.connect() as conn:
        for name in table_strictness(engine):
            counts[name] = int(conn.exec_driver_sql(f'SELECT count(*) FROM "{name}"').scalar_one())
    return counts
