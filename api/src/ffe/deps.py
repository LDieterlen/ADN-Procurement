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
