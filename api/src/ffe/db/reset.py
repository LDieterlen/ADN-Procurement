"""Dev-only database rebuild (ADR-0012, design phase): the single migration is regenerated from the
models at every schema change, so the dev database is thrown away and rebuilt. The new database is
built whole in a side file (schema, product types, then the demo project and the contacts directory
added by `ffe.devreset`, which needs the services) and only then swapped in, after a backup: an
interrupted rebuild (a `--reload` restart) leaves the old database untouched. Never on the real
database."""

import os
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from sqlalchemy import Engine, text

from ffe.config import Settings
from ffe.db import DbError
from ffe.db.backup import backup
from ffe.db.engine import create_db_engine, quick_check
from ffe.db.migrate import schema_drift, upgrade_head
from ffe.db.seed import seed_categories

Clock = Callable[[], datetime]
SIDE_FILES = ("", "-wal", "-shm")


def _building_path(settings: Settings) -> Path:
    return settings.db_path.with_name(settings.db_path.name + ".rebuild")


def _unlink(path: Path) -> None:
    for suffix in SIDE_FILES:
        path.with_name(path.name + suffix).unlink(missing_ok=True)


def build_dev_database(settings: Settings, clock: Clock) -> tuple[Engine, int]:
    """Creates the side database at the models' schema with the product types; returns its engine
    and the types inserted. Leftovers of an interrupted rebuild are discarded first."""
    if not settings.is_dev_db:
        raise DbError("reset-dev refusé : base réelle (--prod). Migrer à la main.")
    path = _building_path(settings)
    _unlink(path)
    building = create_db_engine(path)
    upgrade_head(building)
    if schema_drift(building):
        building.dispose()
        _unlink(path)
        raise DbError("reset-dev : la migration 0001 ne correspond pas aux modèles (la régénérer).")
    return building, seed_categories(building, clock)


def discard_dev_database(settings: Settings, building: Engine) -> None:
    building.dispose()
    _unlink(_building_path(settings))


def install_dev_database(
    settings: Settings, engine: Engine, building: Engine, clock: Clock
) -> tuple[Engine, Path | None]:
    """Checks the side database, backs up the current one, swaps the files; returns the new engine
    and the backup made (None without a previous file)."""
    verdict = quick_check(building)
    if verdict != "ok":
        discard_dev_database(settings, building)
        raise DbError(f"reset-dev : quick_check {verdict}.")
    with building.connect() as conn:  # everything into the main file before the swap
        conn.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
    building.dispose()
    made = (
        backup(engine, settings.backups_dir, clock, label="pre-reset")
        if settings.db_path.exists()
        else None
    )
    engine.dispose()
    for suffix in SIDE_FILES[1:]:
        settings.db_path.with_name(settings.db_path.name + suffix).unlink(missing_ok=True)
        _building_path(settings).with_name(_building_path(settings).name + suffix).unlink(
            missing_ok=True
        )
    os.replace(_building_path(settings), settings.db_path)
    return create_db_engine(settings.db_path), made
