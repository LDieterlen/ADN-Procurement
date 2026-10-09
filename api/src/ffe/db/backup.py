"""Backups: `sqlite3.Connection.backup()` only, quick_check of the copy, calendar rotation, restore.

Rule (ARCHITECTURE §5): never copy `ffe.sqlite` while it is open elsewhere; the WAL may hold
unintegrated writes. Everything here goes through the SQLite backup API.
"""

import os
import re
import shutil
import sqlite3
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import Engine

from ffe.db import DbError

Clock = Callable[[], datetime]

BACKUP_NAME = re.compile(r"^ffe-(\d{8})-(\d{6})(?:-(?P<label>[A-Za-z0-9_.-]+))?\.sqlite$")
KEEP_DAILY = 14
KEEP_WEEKLY = 8
KEEP_MONTHLY = 12
KEEP_LABELED_DAYS = 90


class BackupError(DbError):
    pass


@dataclass(frozen=True)
class BackupFile:
    path: Path
    at: datetime
    label: str | None


def quick_check_file(path: Path) -> str:
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        row = conn.execute("PRAGMA quick_check").fetchone()
    except sqlite3.DatabaseError as error:
        return str(error)
    finally:
        conn.close()
    return str(row[0]) if row else "ok"


def list_backups(backups_dir: Path) -> list[BackupFile]:
    found: list[BackupFile] = []
    if not backups_dir.is_dir():
        return found
    for path in backups_dir.iterdir():
        match = BACKUP_NAME.match(path.name)
        if match is None or not path.is_file():
            continue
        at = datetime.strptime(match.group(1) + match.group(2), "%Y%m%d%H%M%S").replace(tzinfo=UTC)
        found.append(BackupFile(path, at, match.group("label")))
    return sorted(found, key=lambda b: b.at)


def last_backup_at(backups_dir: Path) -> datetime | None:
    backups = list_backups(backups_dir)
    return backups[-1].at if backups else None


def _db_path(engine: Engine) -> Path:
    return Path(str(engine.url.database))


def backup(
    engine: Engine, backups_dir: Path, clock: Clock, label: str | None = None
) -> Path | None:
    """Writes `backups/ffe-YYYYMMDD-HHMMSS[-label].sqlite`; None when there is no database yet."""
    db_path = _db_path(engine)
    if not db_path.exists():
        return None
    if label is not None and not re.fullmatch(r"[A-Za-z0-9_.-]+", label):
        raise BackupError(f"Libellé de sauvegarde invalide : {label!r}.")
    tmp_dir = backups_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    stamp = clock().astimezone(UTC).strftime("%Y%m%d-%H%M%S")
    name = f"ffe-{stamp}{'-' + label if label else ''}.sqlite"
    tmp_path, final_path = tmp_dir / name, backups_dir / name

    with engine.connect() as conn:
        conn.exec_driver_sql("PRAGMA wal_checkpoint(TRUNCATE)")
    source = sqlite3.connect(db_path)
    target = sqlite3.connect(tmp_path)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()
    verdict = quick_check_file(tmp_path)
    if verdict != "ok":
        tmp_path.unlink(missing_ok=True)
        raise BackupError(f"Sauvegarde refusée, quick_check : {verdict}")
    tmp_path.rename(final_path)
    rotate(backups_dir, clock())
    return final_path


def rotate(backups_dir: Path, now: datetime) -> list[Path]:
    """Keeps the latest backup of the last 14 days, 8 weeks and 12 months; labeled ones 90 days."""
    backups = list_backups(backups_dir)
    unlabeled = [b for b in backups if b.label is None]
    keep: set[Path] = set()
    buckets_by_rule: tuple[tuple[Callable[[BackupFile], object], int], ...] = (
        (lambda b: b.at.date(), KEEP_DAILY),
        (lambda b: b.at.isocalendar()[:2], KEEP_WEEKLY),
        (lambda b: (b.at.year, b.at.month), KEEP_MONTHLY),
    )
    for key, limit in buckets_by_rule:
        latest_per_bucket: dict[object, BackupFile] = {}
        for b in unlabeled:
            latest_per_bucket[key(b)] = b  # sorted ascending: the last one wins
        buckets = sorted(latest_per_bucket.values(), key=lambda b: b.at)[-limit:]
        keep.update(b.path for b in buckets)
    cutoff = now.astimezone(UTC) - timedelta(days=KEEP_LABELED_DAYS)
    keep.update(b.path for b in backups if b.label is not None and b.at >= cutoff)

    removed: list[Path] = []
    for b in backups:
        if b.path not in keep:
            b.path.unlink()
            removed.append(b.path)
    return removed


def restore(engine: Engine, source: Path, backups_dir: Path, clock: Clock) -> Path | None:
    """Replaces the database by `source` (checked first); returns the pre-restore backup path."""
    if not source.is_file():
        raise BackupError(f"Fichier introuvable : {source}")
    verdict = quick_check_file(source)
    if verdict != "ok":
        raise BackupError(f"Restauration refusée, quick_check de {source.name} : {verdict}")
    db_path = _db_path(engine)
    safety = backup(engine, backups_dir, clock, label="pre-restore")
    engine.dispose()
    staged = db_path.with_name(db_path.name + ".restore-tmp")
    shutil.copyfile(source, staged)
    for suffix in ("-wal", "-shm"):
        db_path.with_name(db_path.name + suffix).unlink(missing_ok=True)
    os.replace(staged, db_path)
    verdict = quick_check_file(db_path)
    if verdict != "ok":
        raise BackupError(f"Base restaurée mais quick_check échoue : {verdict}")
    return safety
