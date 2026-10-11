"""DTO of `POST /api/v1/system/backup` (API.md « Sauvegarde », step 9)."""

from ffe.schemas.base import BaseSchema


class BackupRead(BaseSchema):
    path: str
    copied_to: str | None  # None = FFE_BACKUP_DIR missing or copy refused (see `copyError`)
    copy_error: str | None
    quick_check: str
    at: str
