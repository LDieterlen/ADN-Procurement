"""Production mode: `web/dist/` is served by the API with an `index.html` fallback (ARCHITECTURE §1)."""

from pathlib import Path

from fastapi.testclient import TestClient

from ffe.app import Deps, create_app
from ffe.config import Settings


def make_client(tmp_path: Path) -> TestClient:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>API OK</html>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    return TestClient(create_app(Deps(settings=Settings(web_dist=dist))))


def test_root_serves_index(tmp_path: Path) -> None:
    response = make_client(tmp_path).get("/")
    assert response.status_code == 200
    assert "API OK" in response.text


def test_unknown_path_falls_back_to_index(tmp_path: Path) -> None:
    response = make_client(tmp_path).get("/clients/42")
    assert response.status_code == 200
    assert "API OK" in response.text


def test_asset_is_served(tmp_path: Path) -> None:
    response = make_client(tmp_path).get("/assets/app.js")
    assert response.status_code == 200
    assert response.text == "console.log(1)"


def test_api_wins_over_fallback(tmp_path: Path) -> None:
    assert make_client(tmp_path).get("/api/v1/health").json()["ok"] is True
