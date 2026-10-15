"""The v1 is declared (ADR-0020): a real database created at the v1 must keep every row through
every later migration. The frozen fixture `fixtures/v1_demo.sql` stands for that database."""

import hashlib
import sqlite3
from pathlib import Path
from typing import Any

import pytest

from ffe.config import Settings
from ffe.db import startup
from ffe.db.migrate import current_revision, head_revision
from ffe.db.startup import StartupError, run_startup
from ffe.deps import Clock

API_ROOT = Path(__file__).resolve().parents[1]
V1_MIGRATION = API_ROOT / "alembic" / "versions" / "0001_initial.py"
V1_MIGRATION_SHA256 = "8373fb05f1925bbfcf44467ca131243f9726b07a643ecbef5fe7da374a02ab42"
V1_DUMP = Path(__file__).parent / "fixtures" / "v1_demo.sql"

Rows = dict[str, tuple[list[str], dict[int, tuple[Any, ...]]]]


def _rows(db: Path) -> Rows:
    """Table → (columns, rowid → values), alembic's own table left out."""
    conn = sqlite3.connect(db)
    try:
        names = [
            str(r[0])
            for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' "
                "AND name NOT LIKE 'sqlite_%' AND name <> 'alembic_version'"
            )
        ]
        found: Rows = {}
        for name in names:
            cursor = conn.execute(f'SELECT rowid, * FROM "{name}"')
            columns = [d[0] for d in cursor.description][1:]
            found[name] = (columns, {int(r[0]): tuple(r[1:]) for r in cursor})
        return found
    finally:
        conn.close()


@pytest.fixture
def v1_settings(settings: Settings) -> Settings:
    """A real (prod) database at the v1, as on the user's Mac."""
    real = settings.model_copy(update={"env": "prod"})
    real.resolved_data_dir.mkdir(parents=True)
    conn = sqlite3.connect(real.db_path)
    conn.executescript(V1_DUMP.read_text(encoding="utf-8"))
    conn.close()
    return real


def test_the_v1_migration_is_frozen() -> None:
    """`0001_initial.py` is the user's schema: never edited again, a change = a new migration."""
    assert hashlib.sha256(V1_MIGRATION.read_bytes()).hexdigest() == V1_MIGRATION_SHA256


def test_a_v1_database_upgrades_to_head_keeping_every_row(
    v1_settings: Settings, clock: Clock
) -> None:
    before = _rows(v1_settings.db_path)
    assert sum(len(rows) for _, rows in before.values()) > 50  # the demo is really there
    started = run_startup(v1_settings, clock)  # refuses a schema behind the models (prod)
    try:
        assert current_revision(started.engine) == head_revision()
    finally:
        started.close()
    after = _rows(v1_settings.db_path)
    for table, (columns, rows) in before.items():
        assert table in after, f"table {table} disparue"
        new_columns, new_rows = after[table]
        kept = [new_columns.index(c) for c in columns]  # new columns may be added, never removed
        for rowid, values in rows.items():
            assert rowid in new_rows, f"{table} : ligne {rowid} disparue"
            assert tuple(new_rows[rowid][i] for i in kept) == values, f"{table} : ligne {rowid}"


def test_a_migration_that_loses_rows_stops_the_start(
    v1_settings: Settings, clock: Clock, monkeypatch: pytest.MonkeyPatch
) -> None:
    from sqlalchemy import Engine, text

    def losing_upgrade(engine: Engine) -> None:  # a wrong migration that deletes rows
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM project_item_event"))

    monkeypatch.setattr(startup, "has_pending", lambda engine: True)
    monkeypatch.setattr(startup, "upgrade_head", losing_upgrade)
    with pytest.raises(StartupError, match="project_item_event") as refused:
        run_startup(v1_settings, clock)
    assert "pre-migrate" in str(refused.value)  # the backup taken just before is named


def test_files_of_a_v1_article_survive_the_finish_category(
    v1_settings: Settings, clock: Clock
) -> None:
    """0002 rebuilds `project_item_file` (a value added to its CHECK): every junction is kept."""
    conn = sqlite3.connect(v1_settings.db_path)
    now = "2026-10-14T12:00:00Z"
    conn.execute(
        "INSERT INTO file (id, sha256, ext, mime_type, size_bytes, original_name, created_at) "
        "VALUES (1, ?, 'png', 'image/png', 10, 'a.png', ?), (2, ?, 'pdf', 'application/pdf', 10, "
        "'plan.pdf', ?)",
        ("a" * 64, now, "b" * 64, now),
    )
    conn.execute(
        "INSERT INTO project_item_file (project_item_id, file_id, kind, is_primary, caption, "
        "sort_order, created_at, updated_at) VALUES (1, 1, 'image', 1, 'face', 0, ?, ?), "
        "(1, 2, 'drawing', 0, NULL, 1, ?, ?)",
        (now, now, now, now),
    )
    conn.commit()
    conn.close()
    before = _rows(v1_settings.db_path)["project_item_file"]
    run_startup(v1_settings, clock).close()
    assert _rows(v1_settings.db_path)["project_item_file"] == before
    conn = sqlite3.connect(v1_settings.db_path)
    try:
        conn.execute(
            "UPDATE project_item_file SET kind = 'finish', is_primary = 0 WHERE file_id = 1"
        )
        conn.commit()
        with pytest.raises(sqlite3.IntegrityError):  # the CHECK is still there, widened only
            conn.execute("UPDATE project_item_file SET kind = 'colour' WHERE file_id = 2")
        sql = conn.execute(
            "SELECT sql FROM sqlite_master WHERE name = 'project_item_file'"
        ).fetchone()[0]
        assert str(sql).rstrip().endswith("STRICT")
        indexes = {r[1] for r in conn.execute("PRAGMA index_list('project_item_file')")}
        assert {"ix_project_item_file_file_id", "uq_project_item_file_primary"} <= indexes
    finally:
        conn.close()
