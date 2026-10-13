"""Dev-only database rebuild (ADR-0012, design phase): the single migration is regenerated from the
models at every schema change, so the dev database is thrown away and rebuilt — backup first, then
schema and product types. The demo project and the contacts directory are added by `ffe.devreset`
(services live outside the db package). Never on the real database."""

from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from sqlalchemy import Engine

from ffe.config import Settings
from ffe.db import DbError
from ffe.db.backup import backup
from ffe.db.engine import create_db_engine, quick_check
from ffe.db.migrate import schema_drift, upgrade_head
from ffe.db.seed import seed_categories

Clock = Callable[[], datetime]


def rebuild_dev_database(
    settings: Settings, engine: Engine, clock: Clock
) -> tuple[Engine, Path | None, int]:
    """Backs up, deletes and recreates the dev database at the models' schema with the product
    types; returns the new engine, the backup made (None without a file) and the types inserted."""
    if not settings.is_dev_db:
        raise DbError("reset-dev refusé : base réelle (--prod). Migrer à la main.")
    made = (
        backup(engine, settings.backups_dir, clock, label="pre-reset")
        if settings.db_path.exists()
        else None
    )
    engine.dispose()
    for suffix in ("", "-wal", "-shm"):
        settings.db_path.with_name(settings.db_path.name + suffix).unlink(missing_ok=True)
    fresh = create_db_engine(settings.db_path)
    upgrade_head(fresh)
    if schema_drift(fresh):
        raise DbError("reset-dev : la migration 0001 ne correspond pas aux modèles (la régénérer).")
    types = seed_categories(fresh, clock)
    verdict = quick_check(fresh)
    if verdict != "ok":
        raise DbError(f"reset-dev : quick_check {verdict}.")
    return fresh, made, types
