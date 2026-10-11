"""`/settings` (étape 9) : lecture, PATCH partiel, 422 champ par champ, défauts hérités."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_client
from ffe.deps import Clock


def test_settings_are_read_with_their_defaults(client: TestClient) -> None:
    body = client.get("/api/v1/settings").json()
    assert body["id"] == 1 and body["defaultVatBp"] == 2000 and body["baseCurrency"] == "EUR"
    assert body["defaultContingencyBp"] == 1000 and body["projectCodePrefix"] == ""
    assert body["agencyName"] == "" and body["agencySiret"] is None


def test_partial_patch_keeps_the_other_fields(client: TestClient) -> None:
    first = client.patch(
        "/api/v1/settings",
        json={
            "agencyName": "  Atelier X ",
            "agencySiret": "123 456 789 00012",
            "agencyVatNumber": "fr 12345678900",
        },
    )
    assert first.status_code == 200, first.text
    assert first.json()["agencyName"] == "ATELIER X" or first.json()["agencyName"] == "Atelier X"
    assert first.json()["agencySiret"] == "12345678900012"
    assert first.json()["agencyVatNumber"] == "FR12345678900"
    second = client.patch("/api/v1/settings", json={"defaultVatBp": 1000, "projectCodePrefix": "p"})
    assert second.json()["defaultVatBp"] == 1000 and second.json()["projectCodePrefix"] == "P"
    assert second.json()["agencySiret"] == "12345678900012"  # untouched
    assert second.json()["updatedAt"] == "2026-10-09T12:00:00Z"


def test_each_invalid_field_is_named(client: TestClient) -> None:
    bad = client.patch(
        "/api/v1/settings",
        json={
            "defaultVatBp": 10001,
            "agencySiret": "123",
            "agencyEmail": "nope",
            "agencyName": None,
        },
    )
    assert bad.status_code == 422
    fields = sorted(d["field"] for d in bad.json()["details"])
    assert fields == ["agencyEmail", "agencyName", "agencySiret", "defaultVatBp"]


def test_empty_optional_texts_become_null(client: TestClient) -> None:
    body = client.patch("/api/v1/settings", json={"agencyAddress": "   ", "agencyPhone": ""}).json()
    assert body["agencyAddress"] is None and body["agencyPhone"] is None


def test_new_projects_inherit_the_patched_defaults(
    client: TestClient, session: Session, clock: Clock
) -> None:
    client.patch(
        "/api/v1/settings",
        json={"defaultVatBp": 550, "defaultContingencyBp": 500, "projectCodePrefix": "P"},
    )
    owner = make_client(session, clock)
    project = client.post("/api/v1/projects", json={"name": "Villa", "clientId": owner.id}).json()
    assert project["defaultVatBp"] == 550 and project["contingencyBp"] == 500
    assert project["code"].startswith("P2026-")
