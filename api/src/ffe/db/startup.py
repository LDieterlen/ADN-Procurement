"""Startup cycle (ARCHITECTURE §5, immutable order). Any failure = stop, database untouched."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import Engine

from ffe.config import Settings
from ffe.db import DbError
from ffe.db.backup import BACKUP_MAX_AGE, backup_and_copy, last_backup_at
from ffe.db.engine import create_db_engine, foreign_key_check, quick_check, row_counts
from ffe.db.fs_check import ensure_safe_data_dir
from ffe.db.lock import InstanceLock
from ffe.db.migrate import has_pending, head_revision, schema_drift, upgrade_head

Clock = Callable[[], datetime]
# Dev only (ADR-0020): rebuilds the database when its schema differs; `ffe.devreset.reset_dev`.
OnDrift = Callable[[Settings, Engine, Clock], tuple[Engine, str]]


class StartupError(DbError):
    pass


@dataclass
class Started:
    settings: Settings
    engine: Engine
    lock: InstanceLock
    backup_path: str | None  # None = skipped (no database yet, or recent backup)
    backup_copy_error: str | None = None  # Windows copy refused (ADR-0002: never fatal)
    reset_note: str | None = None  # dev only: the database was rebuilt because the schema moved

    def close(self) -> None:
        self.engine.dispose()
        self.lock.release()


def utcnow() -> datetime:
    return datetime.now(UTC)


def prepare_data_dir(settings: Settings) -> None:
    """Steps 1: disk check (ADR-0019), then create the data directories."""
    data_dir = settings.resolved_data_dir
    ensure_safe_data_dir(data_dir)
    (settings.backups_dir / "tmp").mkdir(parents=True, exist_ok=True)


def run_startup(
    settings: Settings, clock: Clock = utcnow, on_drift: OnDrift | None = None
) -> Started:
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
        copy_error: str | None = None
        if db_existed:  # 4
            last = last_backup_at(settings.backups_dir)
            stale = last is None or clock().astimezone(UTC) - last > BACKUP_MAX_AGE
            if pending or stale:
                label = f"pre-migrate-{head_revision()}" if pending else None
                result = backup_and_copy(engine, settings, clock, label=label)
                backup_path, copy_error = str(result.path), result.copy_error
        if pending:
            before = row_counts(engine)
            upgrade_head(engine)  # 5
            # Migrations are additive after the v1 (ADR-0020): a table that loses rows stops it all.
            after = row_counts(engine)
            lost = sorted(
                t for t, n in before.items() if t != "alembic_version" and after.get(t, 0) < n
            )
            if lost:
                raise StartupError(
                    f"migration : des lignes ont disparu ({', '.join(lost)}). Base non servie ; "
                    f"restaurer {backup_path} (`ffe db restore`)."
                )
        violations = foreign_key_check(engine)  # 6
        if violations:
            hint = f" ; restaurer {backup_path}" if backup_path else ""
            raise StartupError(f"foreign_key_check : {len(violations)} violation(s){hint}.")
        verdict = quick_check(engine)  # 7
        if verdict != "ok":
            raise StartupError(f"quick_check après migration : {verdict}.")
        reset_note: str | None = None
        if schema_drift(engine):  # 8 (dev only, ADR-0020: the dev database is rebuilt at head)
            if not settings.is_dev_db:
                raise StartupError(
                    "schéma en retard sur les modèles : base réelle, migrer à la main."
                )
            if on_drift is None:
                raise StartupError("schéma en retard sur les modèles : lancer `ffe db reset-dev`.")
            engine, reset_note = on_drift(settings, engine, clock)
        return Started(settings, engine, lock, backup_path, copy_error, reset_note)
    except BaseException:
        if engine is not None:
            engine.dispose()
        lock.release()
        raise
