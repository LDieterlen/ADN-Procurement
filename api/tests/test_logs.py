"""Journal `logs/ffe.log` : une ligne par requête, chaque 500 avec sa trace (ARCHITECTURE §5)."""

from fastapi.testclient import TestClient

from conftest import BASE_URL
from ffe.app import create_app
from ffe.config import Settings
from ffe.deps import Deps
from ffe.logs import configure_logging


def test_requests_and_500s_are_written_to_the_log_file(deps: Deps, settings: Settings) -> None:
    log_path = configure_logging(settings.logs_dir)
    app = create_app(deps)

    def boom() -> None:
        raise RuntimeError("provoked")

    app.add_api_route("/api/v1/boom", boom, methods=["GET"])
    client = TestClient(app, base_url=BASE_URL, raise_server_exceptions=False)
    assert client.get("/api/v1/health").status_code == 200
    failed = client.get("/api/v1/boom")
    assert failed.status_code == 500 and failed.json()["code"] == "internal_error"
    text = log_path.read_text(encoding="utf-8")
    assert "INFO GET /api/v1/health 200" in text
    assert "ERROR 500 GET /api/v1/boom" in text and "RuntimeError: provoked" in text
    assert "INFO GET /api/v1/boom 500" in text
    assert log_path == settings.logs_dir / "ffe.log"
