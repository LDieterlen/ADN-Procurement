"""`/settings` : lecture, PATCH partiel, 422 champ par champ, préfixe hérité par les projets."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_client
from ffe.deps import Clock


def test_settings_are_read_with_their_defaults(client: TestClient) -> None:
    body = client.get("/api/v1/settings").json()
    assert body["id"] == 1 and body["baseCurrency"] == "EUR" and body["projectCodePrefix"] == ""
    assert body["agencyName"] == "" and body["agencyAddress"] is None


def test_partial_patch_keeps_the_other_fields(client: TestClient) -> None:
    first = client.patch(
        "/api/v1/settings", json={"agencyName": "  Atelier X ", "agencyPhone": "01 02 03 04 05"}
    )
    assert first.status_code == 200, first.text
    assert first.json()["agencyName"] == "Atelier X"
    second = client.patch("/api/v1/settings", json={"projectCodePrefix": "p"})
    assert second.json()["projectCodePrefix"] == "P"
    assert second.json()["agencyPhone"] == "01 02 03 04 05"  # untouched
    assert second.json()["updatedAt"] == "2026-10-09T12:00:00Z"


def test_each_invalid_field_is_named(client: TestClient) -> None:
    bad = client.patch(
        "/api/v1/settings",
        json={"projectCodePrefix": "é", "agencyEmail": "nope", "agencyName": None},
    )
    assert bad.status_code == 422
    fields = sorted(d["field"] for d in bad.json()["details"])
    assert fields == ["agencyEmail", "agencyName", "projectCodePrefix"]


def test_empty_optional_texts_become_null(client: TestClient) -> None:
    body = client.patch("/api/v1/settings", json={"agencyAddress": "   ", "agencyPhone": ""}).json()
    assert body["agencyAddress"] is None and body["agencyPhone"] is None


def test_new_projects_use_the_patched_prefix(
    client: TestClient, session: Session, clock: Clock
) -> None:
    client.patch("/api/v1/settings", json={"projectCodePrefix": "P"})
    owner = make_client(session, clock)
    project = client.post("/api/v1/projects", json={"name": "Villa", "clientId": owner.id}).json()
    assert project["code"].startswith("P2026-")
