"""Étape 9 : copie vérifiée vers FFE_BACKUP_DIR (rotation là aussi), fichiers joints, règle 24 h
et « modifiée depuis », minuterie et sauvegarde à l'arrêt (ARCHITECTURE §5, ADR-0002)."""

import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import Engine, insert

from conftest import FIXED_NOW
from ffe.config import Settings
from ffe.db.backup import (
    BackupError,
    backup,
    backup_and_copy,
    copy_to_backup_dir,
    list_backups,
    needs_backup,
    quick_check_file,
    sync_files,
)
from ffe.db.scheduler import BackupScheduler
from ffe.deps import Clock
from ffe.models import Client

NOW = "2026-10-09T12:00:00Z"


def test_backup_and_copy_puts_a_checked_copy_in_the_windows_dir(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    result = backup_and_copy(engine, settings, clock, label="manual")
    assert result.path == settings.backups_dir / "ffe-20261009-120000-manual.sqlite"
    assert result.copied_to == settings.backup_dir / "ffe-20261009-120000-manual.sqlite"
    assert result.copy_error is None and result.quick_check == "ok"
    assert result.copied_to is not None and quick_check_file(result.copied_to) == "ok"
    assert not (settings.backup_dir / "ffe-20261009-120000-manual.sqlite.part").exists()


def test_missing_windows_dir_is_reported_not_fatal(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    settings.backup_dir.rmdir()
    result = backup_and_copy(engine, settings, clock)
    assert result.path.exists() and result.copied_to is None
    assert result.copy_error is not None and "absent" in result.copy_error


def test_corrupt_copy_is_refused_and_removed(settings: Settings, ext4_tmp: Path) -> None:
    bogus = ext4_tmp / "ffe-20261009-120000.sqlite"
    bogus.write_bytes(b"not a database" * 100)
    with pytest.raises(BackupError, match="quick_check"):
        copy_to_backup_dir(bogus, settings.backup_dir, FIXED_NOW)
    assert list(settings.backup_dir.iterdir()) == []


def test_windows_dir_is_rotated_too(engine: Engine, settings: Settings) -> None:
    for day in range(20):
        at = datetime(2026, 1, 1, 12, tzinfo=UTC) + timedelta(days=day)
        backup_and_copy(engine, settings, lambda at=at: at)
    local = [b.at.date() for b in list_backups(settings.backups_dir)]
    remote = [b.at.date() for b in list_backups(settings.backup_dir)]
    assert local == remote and len(local) < 20  # 14 daily + weekly + monthly, same on both sides


def test_sync_files_copies_missing_files_only(settings: Settings) -> None:
    settings.files_dir.mkdir(parents=True)
    (settings.files_dir / ("a" * 64 + ".png")).write_bytes(b"A" * 10)
    (settings.files_dir / ("b" * 64 + ".jpg")).write_bytes(b"B" * 20)
    target = settings.backup_dir / "files"
    assert sync_files(settings.files_dir, target) == 2
    assert sync_files(settings.files_dir, target) == 0  # already there, same size
    (settings.files_dir / ("c" * 64 + ".pdf")).write_bytes(b"C")
    assert sync_files(settings.files_dir, target) == 1
    assert sorted(p.name[0] for p in target.iterdir()) == ["a", "b", "c"]


def test_backup_with_files_syncs_the_attachments(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    settings.files_dir.mkdir(parents=True)
    (settings.files_dir / ("d" * 64 + ".png")).write_bytes(b"D")
    result = backup_and_copy(engine, settings, clock, with_files=True)
    assert (
        result.files_copied == 1 and (settings.backup_dir / "files" / ("d" * 64 + ".png")).exists()
    )


def test_needs_backup_applies_the_24h_rule_and_the_modified_rule(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    assert needs_backup(settings, FIXED_NOW) is True  # never backed up
    backup(engine, settings.backups_dir, clock)
    assert needs_backup(settings, FIXED_NOW + timedelta(hours=1)) is False
    assert needs_backup(settings, FIXED_NOW + timedelta(hours=25)) is True
    # The backup stamp is FIXED_NOW (2026) while the file mtime is "now" (real clock, later):
    # the modified rule sees a database newer than its last backup.
    with engine.begin() as conn:
        conn.execute(insert(Client).values(name="C", created_at=NOW, updated_at=NOW))
    assert needs_backup(settings, FIXED_NOW + timedelta(hours=1), modified_rule=True) is True
    fresh = datetime.now(UTC) + timedelta(seconds=5)
    backup(engine, settings.backups_dir, lambda: fresh)
    assert needs_backup(settings, fresh, modified_rule=True) is False


def test_scheduler_tick_backs_up_only_when_stale(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    backup(engine, settings.backups_dir, clock)
    scheduler = BackupScheduler(engine, settings, lambda: FIXED_NOW + timedelta(hours=2))
    assert scheduler.tick() is None
    stale = BackupScheduler(engine, settings, lambda: FIXED_NOW + timedelta(hours=25))
    result = stale.tick()
    assert result is not None and result.copied_to is not None
    assert len(list_backups(settings.backups_dir)) == 2


def test_scheduler_thread_starts_and_stops_cleanly(
    engine: Engine, settings: Settings, clock: Clock
) -> None:
    scheduler = BackupScheduler(engine, settings, clock, interval_seconds=0.05)
    scheduler.start()
    deadline = time.monotonic() + 5
    while not list_backups(settings.backups_dir) and time.monotonic() < deadline:
        time.sleep(0.02)
    scheduler.stop()
    assert len(list_backups(settings.backups_dir)) >= 1  # a tick fired: never backed up before
