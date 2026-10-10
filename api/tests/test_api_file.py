"""`/files`: upload deduplicated by sha256, MIME sniffing, size limit, content download (D6b.1–D6b.6)."""

import hashlib

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import JPEG_BYTES, PDF_BYTES, PNG_BYTES
from ffe.app import create_app
from ffe.config import Settings
from ffe.deps import Clock, Deps
from ffe.services.file import orphans

URL = "/api/v1/files"


def upload(client: TestClient, data: bytes, name: str = "photo.png", declared: str = "image/png"):
    return client.post(URL, files={"file": (name, data, declared)})


def test_upload_stores_once_per_sha256(client: TestClient, settings: Settings) -> None:
    first = upload(client, PNG_BYTES)
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["sha256"] == hashlib.sha256(PNG_BYTES).hexdigest()
    assert body["ext"] == "png" and body["mimeType"] == "image/png"
    assert body["sizeBytes"] == len(PNG_BYTES) and body["originalName"] == "photo.png"
    assert (settings.files_dir / f"{body['sha256']}.png").read_bytes() == PNG_BYTES

    again = upload(client, PNG_BYTES, name="autre-nom.png")
    assert again.status_code == 200 and again.json() == body  # same file, same row
    assert len([p for p in settings.files_dir.iterdir() if p.is_file()]) == 1
    assert not any((settings.files_dir / "tmp").iterdir())


def test_mime_is_sniffed_not_trusted(client: TestClient) -> None:
    refused = upload(client, b"GIF89a" + b"\x00" * 32, name="image.png", declared="image/png")
    assert refused.status_code == 422
    assert refused.json()["details"] == [
        {
            "field": "file",
            "message": "Type de fichier refusé : images JPEG, PNG, WebP ou PDF seulement.",
        }
    ]
    assert (
        upload(client, JPEG_BYTES, name="x.bin", declared="application/octet-stream").json()["ext"]
        == "jpg"
    )
    assert upload(client, PDF_BYTES, name="fiche.pdf").json()["mimeType"] == "application/pdf"
    webp = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 32
    assert upload(client, webp, name="x.webp").json()["ext"] == "webp"


def test_empty_file_is_422(client: TestClient) -> None:
    response = upload(client, b"")
    assert (
        response.status_code == 422 and response.json()["details"][0]["message"] == "Fichier vide."
    )


def test_too_large_is_413(settings: Settings, deps: Deps) -> None:
    deps.settings = Settings(**{**settings.model_dump(), "max_upload_bytes": 100})
    client = TestClient(create_app(deps), base_url="http://127.0.0.1")
    response = upload(client, PNG_BYTES + b"\x00" * 100)
    assert response.status_code == 413
    assert response.json() == {
        "code": "payload_too_large",
        "message": "Fichier trop volumineux : 0 Mo au plus.",
        "details": [],
    }
    assert not any(p for p in (settings.files_dir / "tmp").iterdir())


def test_content_is_served_with_its_type_and_immutable_cache(client: TestClient) -> None:
    file_id = upload(client, PDF_BYTES, name="fiche technique.pdf").json()["id"]
    response = client.get(f"{URL}/{file_id}/content")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert "immutable" in response.headers["cache-control"]
    assert "fiche%20technique.pdf" in response.headers["content-disposition"]
    assert response.content == PDF_BYTES
    assert client.get(f"{URL}/99/content").status_code == 404


def test_orphans_report_both_directions(
    client: TestClient, settings: Settings, session: Session, clock: Clock
) -> None:
    body = upload(client, PNG_BYTES).json()
    (settings.files_dir / "deadbeef.jpg").write_bytes(b"x")
    (settings.files_dir / f"{body['sha256']}.png").unlink()
    on_disk_only, rows_only = orphans(session, settings.files_dir)
    assert on_disk_only == ["deadbeef.jpg"]
    assert rows_only == [f"{body['sha256']}.png"]
