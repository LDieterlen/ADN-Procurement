"""`/system` router: backup on demand (API.md « Sauvegarde », step 9)."""

from datetime import UTC

from fastapi import APIRouter

from ffe.db.backup import backup_and_copy
from ffe.deps import DepsDep
from ffe.schemas.system import BackupRead

router = APIRouter(prefix="/system", tags=["system"])


@router.post("/backup", operation_id="createBackup")
def create_backup(deps: DepsDep) -> BackupRead:
    assert deps.engine is not None, "pas de base ouverte"
    result = backup_and_copy(deps.engine, deps.settings, deps.clock)
    deps.status.last_quick_check = result.quick_check
    return BackupRead(
        path=str(result.path),
        copied_to=str(result.copied_to) if result.copied_to else None,
        copy_error=result.copy_error,
        quick_check=result.quick_check,
        at=deps.clock().astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
