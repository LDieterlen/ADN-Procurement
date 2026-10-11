"""Backups: `sqlite3.Connection.backup()` only, quick_check of the copy, calendar rotation, restore.

Rule (ARCHITECTURE §5): never copy `ffe.sqlite` while it is open elsewhere; the WAL may hold
unintegrated writes. Everything here goes through the SQLite backup API.
"""

import logging
import os
import re
import shutil
import sqlite3
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import Engine

from ffe.config import Settings
from ffe.db import DbError

Clock = Callable[[], datetime]
log = logging.getLogger("ffe")
BACKUP_MAX_AGE = timedelta(hours=24)

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


def copy_to_backup_dir(made: Path, backup_dir: Path, now: datetime) -> Path:
    """Sequential copy of a finished backup into `FFE_BACKUP_DIR` (9p-safe), checked, rotated.

    Raises `BackupError` when the directory is unusable or the copy fails `quick_check`
    (the bad copy is removed). Never touches the local backup.
    """
    if not backup_dir.is_dir() or not os.access(backup_dir, os.W_OK):
        raise BackupError(f"Dossier de copie absent ou non accessible : {backup_dir}")
    staged = backup_dir / (made.name + ".part")
    try:
        shutil.copyfile(made, staged)
        verdict = quick_check_file(staged)
        if verdict != "ok":
            raise BackupError(f"Copie refusée, quick_check de {made.name} : {verdict}")
        final = backup_dir / made.name
        os.replace(staged, final)
    except OSError as error:
        raise BackupError(f"Copie vers {backup_dir} impossible : {error}") from error
    finally:
        staged.unlink(missing_ok=True)
    rotate(backup_dir, now)
    return final


def sync_files(files_dir: Path, target_dir: Path) -> int:
    """Copies the attached files missing in `target_dir` (content-addressed: never overwritten,
    never deleted). Returns the number of files copied."""
    if not files_dir.is_dir():
        return 0
    target_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    for source in sorted(p for p in files_dir.iterdir() if p.is_file()):
        destination = target_dir / source.name
        if destination.exists() and destination.stat().st_size == source.stat().st_size:
            continue
        staged = target_dir / (source.name + ".part")
        shutil.copyfile(source, staged)
        os.replace(staged, destination)
        copied += 1
    return copied


@dataclass(frozen=True)
class BackupResult:
    path: Path
    quick_check: str  # always "ok" (a failing copy is refused before the file exists)
    copied_to: Path | None
    copy_error: str | None
    files_copied: int


def backup_and_copy(
    engine: Engine,
    settings: Settings,
    clock: Clock,
    label: str | None = None,
    with_files: bool = False,
) -> BackupResult:
    """`backup()` then the Windows copy (ADR-0002). A copy failure is reported, never fatal."""
    made = backup(engine, settings.backups_dir, clock, label=label)
    if made is None:
        raise BackupError(f"Aucune base à sauvegarder : {settings.db_path}")
    copied_to: Path | None = None
    copy_error: str | None = None
    files_copied = 0
    try:
        copied_to = copy_to_backup_dir(made, settings.backup_dir, clock())
        if with_files:
            files_copied = sync_files(settings.files_dir, settings.backup_dir / "files")
    except BackupError as error:
        copy_error = str(error)
        log.warning("copie de sauvegarde : %s", error)
    return BackupResult(made, "ok", copied_to, copy_error, files_copied)


def needs_backup(settings: Settings, now: datetime, modified_rule: bool = False) -> bool:
    """24 h rule (ADR-0002); with `modified_rule`, also when the database changed since the last
    backup (file mtime of the base or its WAL), which is what the shutdown backup applies."""
    if not settings.db_path.exists():
        return False
    last = last_backup_at(settings.backups_dir)
    if last is None or now.astimezone(UTC) - last > BACKUP_MAX_AGE:
        return True
    if not modified_rule:
        return False
    candidates = [settings.db_path, settings.db_path.with_name(settings.db_path.name + "-wal")]
    newest = max((p.stat().st_mtime for p in candidates if p.exists()), default=0.0)
    return datetime.fromtimestamp(newest, tz=UTC) > last
