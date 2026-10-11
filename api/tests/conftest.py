"""Shared fixtures (ARCHITECTURE §7): each database test gets its own migrated temporary file,
on ext4 (so `fs_check` and WAL behave as in production), never the real data under ~/.persist/ffe.
Factories go through the services (journal and timestamps guaranteed), never through raw SQL.
"""

import itertools
import shutil
import tempfile
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from ffe.app import create_app
from ffe.config import PERSIST_ROOT, Settings
from ffe.db.engine import create_db_engine
from ffe.db.migrate import upgrade_head
from ffe.deps import Clock, Deps
from ffe.models import (
    Category,
    Client,
    File,
    Manufacturer,
    Product,
    Project,
    ProjectItem,
    Supplier,
    Zone,
)
from ffe.schemas.category import CategoryCreate
from ffe.schemas.client import ClientCreate
from ffe.schemas.manufacturer import ManufacturerCreate
from ffe.schemas.product import ProductCreate
from ffe.schemas.project import ProjectCreate
from ffe.schemas.project_item import ProjectItemCreate
from ffe.schemas.supplier import SupplierCreate
from ffe.schemas.zone import ZoneCreate
from ffe.services.category import create_category
from ffe.services.client import create_client
from ffe.services.file import store_upload
from ffe.services.manufacturer import create_manufacturer
from ffe.services.product import create_product
from ffe.services.project import create_project
from ffe.services.project_item import create_item
from ffe.services.supplier import create_supplier
from ffe.services.zone import create_zone

TESTS_ROOT = PERSIST_ROOT / ".ffe-tests"
FIXED_NOW = datetime(2026, 10, 9, 12, 0, 0, tzinfo=UTC)
# The API only answers to its own host names (D4.5): the test client must present one.
BASE_URL = "http://127.0.0.1"
_counter = itertools.count(1)


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
    return TestClient(create_app(deps), base_url=BASE_URL)


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with Session(engine, expire_on_commit=False) as session:
        yield session


def make_client(session: Session, clock: Clock, **overrides: Any) -> Client:
    """Factory through the service: a valid client with sensible defaults."""
    data: dict[str, Any] = {"name": "Famille Martin", "city": "Paris"}
    data.update(overrides)
    return create_client(session, ClientCreate(**data), clock)


def make_supplier(session: Session, clock: Clock, **overrides: Any) -> Supplier:
    data: dict[str, Any] = {"name": "Tom Dixon Ltd", "country_code": "GB", "currency": "GBP"}
    data.update(overrides)
    return create_supplier(session, SupplierCreate(**data), clock)


def make_manufacturer(session: Session, clock: Clock, **overrides: Any) -> Manufacturer:
    data: dict[str, Any] = {"name": "Flos"}
    data.update(overrides)
    return create_manufacturer(session, ManufacturerCreate(**data), clock)


def make_category(session: Session, clock: Clock, **overrides: Any) -> Category:
    data: dict[str, Any] = {"name": "Luminaires", "code": "LUM"}
    data.update(overrides)
    return create_category(session, CategoryCreate(**data), clock)


def make_product(session: Session, clock: Clock, **overrides: Any) -> Product:
    """A product in a fresh category unless `category_id` is given."""
    if "category_id" not in overrides:
        overrides["category_id"] = make_category(session, clock, name="Divers", code="DIV").id
    data: dict[str, Any] = {"name": "Beat Light Fat", "list_price_cents": 125000}
    data.update(overrides)
    return create_product(session, ProductCreate(**data), clock)


# Tiny valid files for upload tests (signatures only: the API sniffs magic bytes).
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PDF_BYTES = b"%PDF-1.4\n" + b"%" * 64


def make_file(
    session: Session,
    settings: Settings,
    clock: Clock,
    data: bytes = PNG_BYTES,
    name: str = "photo.png",
) -> File:
    stored, _created = store_upload(
        session, settings.files_dir, iter([data]), name, settings.max_upload_bytes, clock
    )
    return stored


def make_project(session: Session, clock: Clock, **overrides: Any) -> Project:
    """A project for a fresh client unless `client_id` is given."""
    if "client_id" not in overrides:
        overrides["client_id"] = make_client(session, clock, name=f"Client {next(_counter)}").id
    data: dict[str, Any] = {"name": "Hôtel X"}
    data.update(overrides)
    return create_project(session, ProjectCreate(**data), clock)


def make_zone(session: Session, clock: Clock, project_id: int, **overrides: Any) -> Zone:
    data: dict[str, Any] = {"code": "CHA", "name": "Chambre type A", "multiplier": 12}
    data.update(overrides)
    return create_zone(session, project_id, ZoneCreate(**data), clock)


def make_item(session: Session, clock: Clock, project_id: int, **overrides: Any) -> ProjectItem:
    """A free line (no product) in a fresh level-1 category unless `category_id` is given."""
    if "category_id" not in overrides and "product_id" not in overrides:
        overrides["category_id"] = make_category(
            session, clock, name=f"Cat {next(_counter)}", code=f"C{next(_counter) % 90 + 10}"
        ).id
    data: dict[str, Any] = {"name": "Ligne", "unit_cost_cents": 10000}
    data.update(overrides)
    return create_item(session, project_id, ProjectItemCreate(**data), clock)
