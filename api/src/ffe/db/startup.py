"""Startup cycle (ARCHITECTURE §5, immutable order). Any failure = stop, database untouched."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import Engine

from ffe.config import Settings
from ffe.db import DbError
from ffe.db.backup import backup, last_backup_at
from ffe.db.engine import create_db_engine, foreign_key_check, quick_check
from ffe.db.fs_check import ensure_ext4
from ffe.db.lock import InstanceLock
from ffe.db.migrate import has_pending, head_revision, upgrade_head

Clock = Callable[[], datetime]
BACKUP_MAX_AGE = timedelta(hours=24)


class StartupError(DbError):
    pass


@dataclass
class Started:
    settings: Settings
    engine: Engine
    lock: InstanceLock
    backup_path: str | None  # None = skipped (no database yet, or recent backup)

    def close(self) -> None:
        self.engine.dispose()
        self.lock.release()


def utcnow() -> datetime:
    return datetime.now(UTC)


def prepare_data_dir(settings: Settings) -> None:
    """Steps 1: ext4 check, then create the data directories."""
    data_dir = settings.resolved_data_dir
    ensure_ext4(data_dir)
    (settings.backups_dir / "tmp").mkdir(parents=True, exist_ok=True)


def run_startup(settings: Settings, clock: Clock = utcnow) -> Started:
    prepare_data_dir(settings)  # 1
    lock = InstanceLock(settings.lock_path)
    lock.acquire()  # 2
    engine: Engine | None = None
    try:
        engine = create_db_engine(settings.db_path)  # 3
        db_existed = settings.db_path.exists()
        if db_existed:
            verdict = quick_check(engine)
            if verdict != "ok":
                raise StartupError(f"quick_check au démarrage : {verdict}. Base non servie.")
        pending = has_pending(engine)
        backup_path: str | None = None
        if db_existed:  # 4
            last = last_backup_at(settings.backups_dir)
            stale = last is None or clock().astimezone(UTC) - last > BACKUP_MAX_AGE
            if pending or stale:
                label = f"pre-migrate-{head_revision()}" if pending else None
                made = backup(engine, settings.backups_dir, clock, label=label)
                backup_path = str(made) if made else None
        if pending:
            upgrade_head(engine)  # 5
        violations = foreign_key_check(engine)  # 6
        if violations:
            hint = f" ; restaurer {backup_path}" if backup_path else ""
            raise StartupError(f"foreign_key_check : {len(violations)} violation(s){hint}.")
        verdict = quick_check(engine)  # 7
        if verdict != "ok":
            raise StartupError(f"quick_check après migration : {verdict}.")
        return Started(settings, engine, lock, backup_path)
    except BaseException:
        if engine is not None:
            engine.dispose()
        lock.release()
        raise
