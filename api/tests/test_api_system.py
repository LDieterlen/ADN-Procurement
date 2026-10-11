"""`POST /system/backup` et `GET /health` enrichi (étape 9) : fichier local + copie Windows."""

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from ffe.config import Settings
from ffe.db.backup import quick_check_file


def test_backup_now_creates_a_checked_file_and_its_windows_copy(
    client: TestClient, settings: Settings
) -> None:
    response = client.post("/api/v1/system/backup")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["path"] == str(settings.backups_dir / "ffe-20261009-120000.sqlite")
    assert body["copiedTo"] == str(settings.backup_dir / "ffe-20261009-120000.sqlite")
    assert body["copyError"] is None and body["quickCheck"] == "ok"
    assert body["at"] == "2026-10-09T12:00:00Z"
    assert quick_check_file(settings.backup_dir / "ffe-20261009-120000.sqlite") == "ok"
    health = client.get("/api/v1/health").json()
    assert health["lastBackupAt"] == "2026-10-09T12:00:00Z" and health["lastQuickCheck"] == "ok"


def test_backup_now_reports_a_missing_windows_dir(
    client: TestClient, settings: Settings, engine: Engine
) -> None:
    settings.backup_dir.rmdir()
    body = client.post("/api/v1/system/backup").json()
    assert body["copiedTo"] is None and "absent" in body["copyError"]
    assert client.get("/api/v1/health").json()["backupDirOk"] is False
