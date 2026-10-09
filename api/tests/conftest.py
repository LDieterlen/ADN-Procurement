"""Shared fixtures. Step 1: an app built from `create_app(deps)` and its `TestClient`.

Step 3 adds the migrated temporary database file and the injected clock (ARCHITECTURE §7).
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ffe.app import Deps, create_app
from ffe.config import Settings


@pytest.fixture
def deps(tmp_path: Path) -> Deps:
    # `web_dist` points nowhere so the static mount never interferes with API tests.
    return Deps(settings=Settings(web_dist=tmp_path / "no-dist"))


@pytest.fixture
def client(deps: Deps) -> TestClient:
    return TestClient(create_app(deps))
