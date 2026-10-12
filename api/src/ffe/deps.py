"""Everything the application receives from the outside world; injected into routers by FastAPI."""

from collections.abc import Callable, Generator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ffe.config import Settings
from ffe.errors import IntegrityConflictError

Clock = Callable[[], datetime]
Fetcher = Callable[[str, int], tuple[bytes, str]]  # (url, max bytes) → (body, content type)


def utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass
class RuntimeStatus:
    """Facts of the running instance, shown by `GET /health` (step 9)."""

    last_quick_check: str | None = None  # verdict of the latest quick_check (startup or backup)
    log_path: str | None = None


@dataclass
class Deps:
    settings: Settings = field(default_factory=Settings)
    engine: Engine | None = None  # None only when building the OpenAPI document
    clock: Clock = utcnow
    on_shutdown: list[Callable[[], None]] = field(default_factory=list[Callable[[], None]])
    status: RuntimeStatus = field(default_factory=RuntimeStatus)
    # The only outward network access of the application (ADR-0014); tests inject a fake.
    fetch_url: Fetcher = field(default_factory=lambda: _default_fetcher)


def get_deps(request: Request) -> Deps:
    deps = request.app.state.deps
    assert isinstance(deps, Deps)
    return deps


def get_session(deps: Deps = Depends(get_deps)) -> Generator[Session]:
    """One ORM session per request; services open the transaction (`with session.begin()`).

    `expire_on_commit=False` keeps returned objects readable after the service committed.
    A constraint violation becomes an `AppError` here, so routers and handlers never see SQLAlchemy.
    """
    assert deps.engine is not None, "pas de base ouverte"
    with Session(deps.engine, expire_on_commit=False) as session:
        try:
            yield session
        except IntegrityError as error:
            detail = str(error.orig) if error.orig is not None else str(error)
            raise IntegrityConflictError(detail) from error


# Router-side aliases: routers import these and never SQLAlchemy itself (ARCHITECTURE §6).
DepsDep = Annotated[Deps, Depends(get_deps)]
SessionDep = Annotated[Session, Depends(get_session)]


def _default_fetcher(url: str, max_bytes: int) -> tuple[bytes, str]:
    from ffe.services.capture import fetch_url

    return fetch_url(url, max_bytes)
