"""Shared fixtures (ARCHITECTURE §7): each database test gets its own migrated temporary file,
on ext4 (so `fs_check` and WAL behave as in production), never the real data under ~/.persist/ffe.
"""

import shutil
import tempfile
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from ffe.app import create_app
from ffe.config import PERSIST_ROOT, Settings
from ffe.db.engine import create_db_engine
from ffe.db.migrate import upgrade_head
from ffe.deps import Clock, Deps

TESTS_ROOT = PERSIST_ROOT / ".ffe-tests"
FIXED_NOW = datetime(2026, 10, 9, 12, 0, 0, tzinfo=UTC)


@pytest.fixture
def clock() -> Clock:
    return lambda: FIXED_NOW


@pytest.fixture
def ext4_tmp() -> Iterator[Path]:
    TESTS_ROOT.mkdir(parents=True, exist_ok=True)
    path = Path(tempfile.mkdtemp(prefix="t-", dir=TESTS_ROOT))
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)


@pytest.fixture
def settings(ext4_tmp: Path) -> Settings:
    backup_dir = ext4_tmp / "windows-backups"
    backup_dir.mkdir()
    return Settings(
        env="dev",
        data_dir=ext4_tmp / "data",
        backup_dir=backup_dir,
        web_dist=ext4_tmp / "no-dist",
    )


@pytest.fixture
def engine(settings: Settings) -> Iterator[Engine]:
    (settings.backups_dir / "tmp").mkdir(parents=True)
    engine = create_db_engine(settings.db_path)
    upgrade_head(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def deps(settings: Settings, engine: Engine, clock: Clock) -> Deps:
    return Deps(settings=settings, engine=engine, clock=clock)


@pytest.fixture
def client(deps: Deps) -> TestClient:
    return TestClient(create_app(deps))
