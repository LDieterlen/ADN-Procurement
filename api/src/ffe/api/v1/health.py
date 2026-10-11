"""`GET /health`: liveness plus database facts (dbPath, isDevDb, schemaRevision, lastBackupAt…)."""

import os
from datetime import UTC

from fastapi import APIRouter, Depends

from ffe.db.backup import last_backup_at
from ffe.db.migrate import current_revision
from ffe.deps import Deps, get_deps
from ffe.schemas.health import HealthRead

router = APIRouter(tags=["system"])


@router.get("/health", operation_id="getHealth")
def get_health(deps: Deps = Depends(get_deps)) -> HealthRead:
    settings = deps.settings
    revision = current_revision(deps.engine) if deps.engine is not None else None
    last = last_backup_at(settings.backups_dir) if deps.engine is not None else None
    backup_dir = settings.backup_dir
    return HealthRead(
        ok=True,
        db_path=str(settings.db_path) if deps.engine is not None else None,
        is_dev_db=settings.is_dev_db,
        schema_revision=revision,
        last_backup_at=last.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ") if last else None,
        backup_dir=str(backup_dir),
        backup_dir_ok=backup_dir.is_dir() and os.access(backup_dir, os.W_OK),
        last_quick_check=deps.status.last_quick_check,
        log_path=deps.status.log_path,
    )
