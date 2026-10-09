"""Backups: consistent copy during a write, quick_check, rotation, restore (ARCHITECTURE §5)."""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import Engine, insert, text

from ffe.config import Settings
from ffe.db import DbError
from ffe.db.backup import backup, last_backup_at, list_backups, restore, rotate
from ffe.db.engine import create_db_engine
from ffe.deps import Clock
from ffe.models import Client

NOW = "2026-10-09T12:00:00Z"


def add_clients(engine: Engine, count: int) -> None:
    with engine.begin() as conn:
        for i in range(count):
            conn.execute(insert(Client).values(name=f"C{i}", created_at=NOW, updated_at=NOW))


def count_clients(path: Path) -> int:
    probe = create_db_engine(path)
    try:
        with probe.connect() as conn:
            return int(conn.execute(text("SELECT count(*) FROM client")).scalar_one())
    finally:
        probe.dispose()


def test_backup_is_consistent_while_a_write_is_pending(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    add_clients(engine, 3)
    with engine.begin() as conn:  # uncommitted write in flight
        conn.execute(insert(Client).values(name="pending", created_at=NOW, updated_at=NOW))
        made = backup(engine, settings.backups_dir, clock)
    assert made is not None and made.name == "ffe-20261009-120000.sqlite"
    assert count_clients(made) == 3  # the pending row is not in the copy
    assert count_clients(settings.db_path) == 4


def test_backup_skipped_when_there_is_no_database(ext4_tmp: Path, clock: Clock) -> None:
    engine = create_db_engine(ext4_tmp / "absent.sqlite")
    try:
        assert backup(engine, ext4_tmp / "backups", clock) is None
    finally:
        engine.dispose()


def test_last_backup_at_reads_the_newest_file(engine: Engine, settings: Settings) -> None:
    assert last_backup_at(settings.backups_dir) is None
    later = datetime(2026, 10, 10, 8, 30, tzinfo=UTC)
    backup(engine, settings.backups_dir, lambda: later, label="manual")
    assert last_backup_at(settings.backups_dir) == later


def test_rotation_keeps_daily_weekly_monthly_and_recent_labeled(ext4_tmp: Path) -> None:
    backups_dir = ext4_tmp / "backups"
    backups_dir.mkdir()
    now = datetime(2026, 10, 9, 12, 0, tzinfo=UTC)
    for days_ago in range(0, 400):  # more than a year of daily backups, two per day
        for hour in ("0300", "2100"):
            stamp = (now - timedelta(days=days_ago)).strftime("%Y%m%d")
            (backups_dir / f"ffe-{stamp}-{hour}00.sqlite").write_bytes(b"")
    (backups_dir / "ffe-20260801-120000-pre-migrate-0001.sqlite").write_bytes(b"")  # 69 days
    (backups_dir / "ffe-20260601-120000-pre-migrate-0000.sqlite").write_bytes(b"")  # 130 days

    rotate(backups_dir, now)

    kept = list_backups(backups_dir)
    unlabeled = [b for b in kept if b.label is None]
    assert all(b.at.hour == 21 for b in unlabeled)  # latest of each bucket wins
    days = {b.at.date() for b in unlabeled}
    assert {(now - timedelta(days=d)).date() for d in range(14)} <= days
    weeks = {b.at.isocalendar()[:2] for b in unlabeled}
    months = {(b.at.year, b.at.month) for b in unlabeled}
    assert len(weeks) >= 8 and len(months) == 12
    assert len(unlabeled) <= 14 + 8 + 12
    labels = sorted(b.label for b in kept if b.label)
    assert labels == ["pre-migrate-0001"]


def test_restore_refuses_a_corrupt_file(engine: Engine, settings: Settings, clock: Clock) -> None:
    corrupt = settings.backups_dir / "corrupt.sqlite"
    corrupt.write_bytes(b"not a database at all")
    with pytest.raises(DbError, match="quick_check|format"):
        restore(engine, corrupt, settings.backups_dir, clock)


def test_restore_replaces_the_database_and_keeps_a_pre_restore_copy(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    add_clients(engine, 2)
    snapshot = backup(engine, settings.backups_dir, clock, label="before")
    assert snapshot is not None
    add_clients(engine, 5)
    assert count_clients(settings.db_path) == 7

    safety = restore(engine, snapshot, settings.backups_dir, clock)

    assert safety is not None and safety.name.endswith("-pre-restore.sqlite")
    assert count_clients(safety) == 7
    assert count_clients(settings.db_path) == 2
