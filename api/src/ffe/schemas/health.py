"""DTO of `GET /api/v1/health` (API.md, step 3 shape, step 9 additions)."""

from ffe.schemas.base import BaseSchema


class HealthRead(BaseSchema):
    ok: bool
    db_path: str | None
    is_dev_db: bool
    schema_revision: str | None
    last_backup_at: str | None
    backup_dir: str
    backup_dir_ok: bool
    last_quick_check: str | None
    log_path: str | None
