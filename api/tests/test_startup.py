"""Startup cycle: refuse outside ext4, refuse a second instance, stop on a corrupt file."""

from datetime import timedelta
from pathlib import Path

import pytest

from conftest import FIXED_NOW
from ffe.config import Settings
from ffe.db import DbError
from ffe.db.backup import list_backups
from ffe.db.fs_check import FsCheckError, ensure_mac_local, ensure_safe_data_dir, mount_of
from ffe.db.lock import LockError
from ffe.db.migrate import current_revision, downgrade_base, head_revision
from ffe.db.startup import StartupError, run_startup
from ffe.deps import Clock
from ffe.devreset import reset_dev


def test_mount_of_resolves_the_longest_prefix(tmp_path: Path) -> None:
    mounts = tmp_path / "mounts"
    mounts.write_text("/dev/root / overlay rw 0 0\n/dev/sde /home/vscode/.persist ext4 rw 0 0\n")
    assert mount_of(Path.home() / ".persist" / "x" / "y", mounts) == (
        "/home/vscode/.persist",
        "ext4",
    )
    assert mount_of(Path("/etc"), mounts) == ("/", "overlay")


def test_mac_accepts_the_home_disk_and_refuses_synced_folders_and_volumes(tmp_path: Path) -> None:
    home = tmp_path / "Users" / "anne"
    ensure_mac_local(home / ".persist" / "ffe", home)  # the default place: accepted
    for refused in (
        home / "Library" / "Mobile Documents" / "com~apple~CloudDocs" / "ffe",  # iCloud Drive
        home / "Library" / "CloudStorage" / "Dropbox" / "ffe",
        Path("/Volumes/Partage/ffe"),
        home / ".." / "autre" / "ffe",  # outside the home once resolved
    ):
        with pytest.raises(FsCheckError, match="disque du Mac"):
            ensure_mac_local(refused, home)


def test_other_systems_are_refused(tmp_path: Path) -> None:
    with pytest.raises(FsCheckError, match="non pris en charge"):
        ensure_safe_data_dir(tmp_path, platform="win32")


def test_refuses_a_data_dir_outside_ext4(tmp_path: Path) -> None:
    settings = Settings(data_dir=tmp_path / "data")  # /tmp: overlay or tmpfs, never ext4
    with pytest.raises(FsCheckError, match="ext4"):
        run_startup(settings)
    assert not (tmp_path / "data").exists()


def test_refuses_the_workspaces_9p_mount() -> None:
    settings = Settings(data_dir=Path("/workspaces/x"))
    with pytest.raises(FsCheckError, match="9p"):
        run_startup(settings)


def test_first_start_creates_and_migrates_without_backup(settings: Settings, clock: Clock) -> None:
    started = run_startup(settings, clock)
    try:
        assert settings.db_path.exists()
        assert current_revision(started.engine) == head_revision()
        assert started.backup_path is None  # no database existed: skipped
        assert list_backups(settings.backups_dir) == []
    finally:
        started.close()


def test_second_instance_is_refused_by_the_lock(settings: Settings, clock: Clock) -> None:
    first = run_startup(settings, clock)
    try:
        with pytest.raises(LockError, match="tourne déjà"):
            run_startup(settings, clock)
    finally:
        first.close()
    second = run_startup(settings, clock)  # released: allowed again
    second.close()


def test_stale_backup_triggers_a_backup_on_start(settings: Settings, clock: Clock) -> None:
    run_startup(settings, clock).close()
    later = FIXED_NOW + timedelta(hours=25)
    started = run_startup(settings, lambda: later)
    try:
        assert started.backup_path is not None
        assert list_backups(settings.backups_dir)[-1].label is None
        assert started.backup_copy_error is None
        assert list_backups(settings.backup_dir)[-1].path.name == Path(started.backup_path).name
    finally:
        started.close()
    again = run_startup(settings, lambda: later + timedelta(hours=1))
    try:
        assert again.backup_path is None  # less than 24 h old
    finally:
        again.close()


def test_pending_migration_makes_a_pre_migrate_backup(settings: Settings, clock: Clock) -> None:
    started = run_startup(settings, clock)
    downgrade_base(started.engine)
    started.close()
    again = run_startup(settings, clock)
    try:
        assert again.backup_path is not None and "pre-migrate-0001" in again.backup_path
        assert current_revision(again.engine) == head_revision()
    finally:
        again.close()


def test_corrupt_database_stops_the_start_and_is_left_untouched(
    settings: Settings, clock: Clock
) -> None:
    run_startup(settings, clock).close()
    garbage = b"SQLite format 3\x00" + b"\xff" * 4096
    settings.db_path.write_bytes(garbage)
    with pytest.raises((StartupError, DbError)) as first:
        run_startup(settings, clock)
    assert not isinstance(first.value, LockError)
    assert settings.db_path.read_bytes() == garbage
    with pytest.raises(
        (StartupError, DbError)
    ) as second:  # lock released: same refusal, not LockError
        run_startup(settings, clock)
    assert not isinstance(second.value, LockError)


def test_dev_schema_drift_rebuilds_the_database(settings: Settings, clock: Clock) -> None:
    """Design phase (ADR-0012): a dev database behind the models is backed up and rebuilt."""
    from sqlalchemy import text

    first = run_startup(settings, clock)
    first.close()
    from ffe.db.engine import create_db_engine

    stale = create_db_engine(settings.db_path)
    with stale.begin() as conn:
        conn.execute(text("ALTER TABLE project ADD COLUMN stale TEXT"))
    stale.dispose()
    with pytest.raises(StartupError, match="reset-dev"):
        run_startup(settings, clock)  # without the hook: refused with the command to run
    again = run_startup(settings, clock, on_drift=reset_dev)
    try:
        assert again.reset_note and "base de dev recréée" in again.reset_note
        with again.engine.connect() as conn:
            columns = [row[1] for row in conn.execute(text("PRAGMA table_info(project)"))]
            assert "stale" not in columns
            assert conn.execute(text("SELECT count(*) FROM category")).scalar() == 21
            assert conn.execute(text("SELECT count(*) FROM project")).scalar() == 1  # demo
        assert any("pre-reset" in b.path.name for b in list_backups(settings.backups_dir))
    finally:
        again.close()


def test_prod_schema_drift_stops_the_start(settings: Settings, clock: Clock) -> None:
    from sqlalchemy import text

    from ffe.db.engine import create_db_engine

    prod = Settings(env="prod", data_dir=settings.data_dir, backup_dir=settings.backup_dir)
    first = run_startup(prod, clock)
    first.close()
    stale = create_db_engine(prod.db_path)
    with stale.begin() as conn:
        conn.execute(text("ALTER TABLE project ADD COLUMN stale TEXT"))
    stale.dispose()
    with pytest.raises(StartupError, match="base réelle"):
        run_startup(prod, clock)
