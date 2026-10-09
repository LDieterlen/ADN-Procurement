"""Everything the application receives from the outside world; injected into routers by FastAPI."""

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy import Engine

from ffe.config import Settings

Clock = Callable[[], datetime]


def utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass
class Deps:
    settings: Settings = field(default_factory=Settings)
    engine: Engine | None = None  # None only when building the OpenAPI document
    clock: Clock = utcnow
    on_shutdown: list[Callable[[], None]] = field(default_factory=list[Callable[[], None]])


def get_deps(request: Request) -> Deps:
    deps = request.app.state.deps
    assert isinstance(deps, Deps)
    return deps
