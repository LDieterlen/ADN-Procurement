"""Business errors raised by services, rendered by `api/handlers.py` as `{code, message, details}`.

Root-of-package module, stdlib only: importable from services and routers alike (ARCHITECTURE §6).
"""

from dataclasses import dataclass
from typing import Any

from ffe.i18n import fr


@dataclass(frozen=True)
class ErrorDetail:
    field: str  # camelCase JSON name, dotted path when nested
    message: str


class AppError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(
        self,
        message: str,
        details: list[ErrorDetail] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details: list[ErrorDetail] = details or []
        self.extra: dict[str, Any] = extra or {}

    def payload(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
            "details": [{"field": d.field, "message": d.message} for d in self.details],
        }
        body.update(self.extra)
        return body


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"

    def __init__(self, resource: str, id: int) -> None:
        super().__init__(fr.NOT_FOUND.format(resource=fr.resource_label(resource), id=id))


class ValidationAppError(AppError):
    """A rule attached to one or more fields, outside Pydantic (422)."""

    status_code = 422
    code = "validation_error"

    def __init__(self, details: list[ErrorDetail]) -> None:
        super().__init__(fr.VALIDATION, details=details)


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class DuplicateError(ConflictError):
    code = "duplicate"

    def __init__(self, resource: str, existing_id: int) -> None:
        label = fr.resource_label(resource)
        super().__init__(
            fr.DUPLICATE.format(resource=label, id=existing_id), extra={"existingId": existing_id}
        )


class PayloadTooLargeError(AppError):
    status_code = 413
    code = "payload_too_large"

    def __init__(self, limit_bytes: int) -> None:
        super().__init__(fr.PAYLOAD_TOO_LARGE.format(mb=limit_bytes // (1024 * 1024)))


class IntegrityConflictError(ConflictError):
    """A database constraint fired past Pydantic (the last-resort net, DATA_MODEL §3)."""

    def __init__(self, detail: str) -> None:
        super().__init__(fr.INTEGRITY.format(detail=detail))


class ArchivedDuplicateError(ConflictError):
    def __init__(self, resource: str, archived_id: int) -> None:
        label = fr.resource_label(resource)
        super().__init__(
            fr.DUPLICATE_ARCHIVED.format(resource=label, id=archived_id),
            extra={"archivedId": archived_id},
        )
