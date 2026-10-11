from fastapi.testclient import TestClient
from sqlalchemy import Engine

from ffe.config import Settings
from ffe.db.backup import backup
from ffe.deps import Clock


def test_health_exposes_database_facts(client: TestClient, settings: Settings) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {
        "ok": True,
        "dbPath": str(settings.db_path),
        "isDevDb": True,
        "schemaRevision": "0010",
        "lastBackupAt": None,
        "backupDir": str(settings.backup_dir),
        "backupDirOk": True,
        "lastQuickCheck": None,
        "logPath": None,
    }


def test_health_reports_the_last_backup(
    client: TestClient, engine: Engine, settings: Settings, clock: Clock
) -> None:
    backup(engine, settings.backups_dir, clock)
    assert client.get("/api/v1/health").json()["lastBackupAt"] == "2026-10-09T12:00:00Z"


def test_health_flags_a_missing_backup_dir(client: TestClient, settings: Settings) -> None:
    settings.backup_dir.rmdir()
    assert client.get("/api/v1/health").json()["backupDirOk"] is False


def test_unknown_route_is_404_when_no_web_dist(client: TestClient) -> None:
    assert client.get("/anything").status_code == 404
