"""The single place where errors become HTTP responses `{code, message, details}` (API.md).

Database integrity errors never reach here as such: `deps.get_session` converts them into
`IntegrityConflictError` (an `AppError`), so this module stays free of SQLAlchemy (ARCHITECTURE §6).
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ffe.errors import AppError
from ffe.i18n import fr

log = logging.getLogger("ffe")

NO_STORE = {"Cache-Control": "no-store"}


def _field_path(loc: tuple[Any, ...]) -> str:
    parts = [str(p) for p in loc if p not in ("body", "query", "path", "header")]
    return ".".join(parts) if parts else "body"


def _message(error: dict[str, Any]) -> str:
    """French text for a Pydantic error: by type (fr.PYDANTIC_MESSAGES), else the raw message.

    Custom validators raise `ValueError` with a French text already; Pydantic prefixes it.
    """
    template = fr.PYDANTIC_MESSAGES.get(str(error.get("type", "")))
    if template is not None:
        ctx: dict[str, Any] = error.get("ctx") or {}
        try:
            return template.format(**ctx)
        except KeyError, IndexError:
            return template
    message = str(error.get("msg", fr.VALIDATION))
    return message.removeprefix("Value error, ")


async def app_error_handler(_request: Request, error: AppError) -> JSONResponse:
    return JSONResponse(error.payload(), status_code=error.status_code, headers=NO_STORE)


async def validation_handler(_request: Request, error: RequestValidationError) -> JSONResponse:
    details = [
        {"field": _field_path(tuple(e.get("loc", ()))), "message": _message(e)}
        for e in error.errors()
    ]
    body: dict[str, Any] = {
        "code": "validation_error",
        "message": fr.VALIDATION,
        "details": details,
    }
    return JSONResponse(body, status_code=422, headers=NO_STORE)


async def internal_handler(request: Request, error: Exception) -> JSONResponse:
    log.exception("500 %s %s", request.method, request.url.path, exc_info=error)
    body: dict[str, Any] = {"code": "internal_error", "message": fr.INTERNAL, "details": []}
    return JSONResponse(body, status_code=500, headers=NO_STORE)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, internal_handler)
