"""`/clients`: the template every resource follows (CLAUDE.md « Tests », D4.x)."""

from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import FIXED_NOW, make_client
from ffe.deps import Clock, Deps

VALID: dict[str, Any] = {"name": "Famille Martin", "city": "Paris", "siren": "123456789"}


def post(client: TestClient, body: dict[str, Any], **params: Any) -> Any:
    return client.post("/api/v1/clients", json=body, params=params)


# --- création et relecture -------------------------------------------------------------------


def test_create_returns_201_and_the_resource_reads_back(client: TestClient) -> None:
    response = post(client, VALID)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["id"] == 1 and body["name"] == "Famille Martin" and body["kind"] == "individual"
    assert body["countryCode"] == "FR" and body["siren"] == "123456789"
    assert body["createdAt"] == body["updatedAt"] == "2026-10-09T12:00:00Z"
    assert body["archivedAt"] is None
    assert "created_at" not in body  # camelCase only
    assert client.get("/api/v1/clients/1").json() == body
    assert client.get("/api/v1/clients").json() == [body]


def test_create_trims_the_name(client: TestClient) -> None:
    assert post(client, {"name": "  Hôtel X  "}).json()["name"] == "Hôtel X"


# --- validation 422 champ par champ -----------------------------------------------------------


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"name": ""}, "name"),
        ({"name": "   "}, "name"),
        ({"name": "x" * 201}, "name"),
        ({"name": "A", "kind": "association"}, "kind"),
        ({"name": "A", "countryCode": "FRA"}, "countryCode"),
        ({"name": "A", "countryCode": "fr"}, "countryCode"),
        ({"name": "A", "siren": "12345678"}, "siren"),
        ({"name": "A", "siren": "12345678A"}, "siren"),
        ({"name": "A", "email": "pas-un-mail"}, "email"),
        ({"name": "A", "notes": "n" * 2001}, "notes"),
        ({}, "name"),
    ],
)
def test_create_rejects_each_invalid_field(
    client: TestClient, body: dict[str, Any], field: str
) -> None:
    response = post(client, body)
    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "validation_error" and payload["message"]
    assert [d["field"] for d in payload["details"]] == [field]
    assert response.headers["cache-control"] == "no-store"


def test_validation_messages_are_french(client: TestClient) -> None:
    details = post(client, {"siren": "12", "kind": "association"}).json()["details"]
    by_field = {d["field"]: d["message"] for d in details}
    assert by_field["name"] == "Champ obligatoire."
    assert by_field["siren"] == "Format invalide."
    assert by_field["kind"] == "Valeur non autorisée ; attendu : 'individual' or 'company'."


def test_create_rejects_unreadable_body(client: TestClient) -> None:
    response = client.post(
        "/api/v1/clients", content="{pas du json", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


# --- 404 et ids -----------------------------------------------------------------------------


def test_unknown_id_is_404_with_typed_error(client: TestClient) -> None:
    response = client.get("/api/v1/clients/42")
    assert response.status_code == 404
    assert response.json() == {
        "code": "not_found",
        "message": "Client n° 42 introuvable.",
        "details": [],
    }


@pytest.mark.parametrize("bad_id", ["0", "-1", "abc"])
def test_invalid_id_is_422(client: TestClient, bad_id: str) -> None:
    response = client.get(f"/api/v1/clients/{bad_id}")
    assert response.status_code == 422
    assert response.json()["details"][0]["field"] == "client_id"


# --- doublons ---------------------------------------------------------------------------------


def test_active_duplicate_is_409_duplicate_unless_forced(client: TestClient) -> None:
    first = post(client, VALID).json()
    response = post(client, {"name": "famille  MARTIN"})
    assert response.status_code == 409
    payload = response.json()
    assert payload["code"] == "duplicate" and payload["existingId"] == first["id"]
    forced = post(client, {"name": "famille  MARTIN"}, force="true")
    assert forced.status_code == 201 and forced.json()["id"] == first["id"] + 1


def test_archived_duplicate_is_409_conflict_with_archived_id(client: TestClient) -> None:
    first = post(client, VALID).json()
    client.post(f"/api/v1/clients/{first['id']}/archive")
    response = post(client, {"name": "Famille Martin"}, force="true")
    assert response.status_code == 409
    payload = response.json()
    assert payload["code"] == "conflict" and payload["archivedId"] == first["id"]


def test_accents_and_case_do_not_distinguish_names(client: TestClient) -> None:
    post(client, {"name": "Hôtel Élysée"})
    assert post(client, {"name": "hotel elysee"}).status_code == 409


# --- PATCH ------------------------------------------------------------------------------------


def test_patch_changes_only_the_given_fields(client: TestClient, deps: Deps) -> None:
    created = post(client, {**VALID, "email": "m@example.org"}).json()
    deps.clock = lambda: FIXED_NOW + timedelta(hours=1)
    response = client.patch(f"/api/v1/clients/{created['id']}", json={"city": "Lyon"})
    assert response.status_code == 200
    body = response.json()
    assert (
        body["city"] == "Lyon" and body["email"] == "m@example.org" and body["siren"] == "123456789"
    )
    assert (
        body["createdAt"] == "2026-10-09T12:00:00Z" and body["updatedAt"] == "2026-10-09T13:00:00Z"
    )


def test_patch_null_clears_a_nullable_field(client: TestClient) -> None:
    created = post(client, {**VALID, "email": "m@example.org"}).json()
    body = client.patch(f"/api/v1/clients/{created['id']}", json={"email": None}).json()
    assert body["email"] is None


@pytest.mark.parametrize("field", ["name", "kind", "countryCode"])
def test_patch_null_on_a_required_field_is_422(client: TestClient, field: str) -> None:
    created = post(client, VALID).json()
    response = client.patch(f"/api/v1/clients/{created['id']}", json={field: None})
    assert response.status_code == 422
    assert response.json()["details"] == [
        {"field": field, "message": "Ce champ est obligatoire et ne peut pas être vidé."}
    ]


def test_patch_cannot_rename_onto_another_client(client: TestClient) -> None:
    post(client, {"name": "A"})
    second = post(client, {"name": "B"}).json()
    response = client.patch(f"/api/v1/clients/{second['id']}", json={"name": "a"})
    assert response.status_code == 409 and response.json()["code"] == "duplicate"


def test_patch_ignores_server_fields(client: TestClient) -> None:
    created = post(client, VALID).json()
    response = client.patch(
        f"/api/v1/clients/{created['id']}", json={"id": 99, "createdAt": "2000-01-01T00:00:00Z"}
    )
    assert response.status_code == 200
    assert (
        response.json()["id"] == created["id"]
        and response.json()["createdAt"] == created["createdAt"]
    )


def test_patch_unknown_id_is_404(client: TestClient) -> None:
    assert client.patch("/api/v1/clients/7", json={"city": "Lyon"}).status_code == 404


# --- archivage --------------------------------------------------------------------------------


def test_archive_then_unarchive_round_trip(client: TestClient, deps: Deps) -> None:
    created = post(client, VALID).json()
    deps.clock = lambda: FIXED_NOW + timedelta(days=1)
    archived = client.post(f"/api/v1/clients/{created['id']}/archive")
    assert archived.status_code == 200
    assert archived.json()["archivedAt"] == archived.json()["updatedAt"] == "2026-10-10T12:00:00Z"
    assert client.get("/api/v1/clients").json() == []
    listed = client.get("/api/v1/clients", params={"includeArchived": "true"}).json()
    assert [c["id"] for c in listed] == [created["id"]]
    assert client.get(f"/api/v1/clients/{created['id']}").status_code == 200  # readable by id
    restored = client.post(f"/api/v1/clients/{created['id']}/unarchive")
    assert restored.status_code == 200 and restored.json()["archivedAt"] is None
    assert len(client.get("/api/v1/clients").json()) == 1


def test_archive_twice_and_unarchive_active_are_409(client: TestClient) -> None:
    created = post(client, VALID).json()
    url = f"/api/v1/clients/{created['id']}"
    assert client.post(f"{url}/unarchive").status_code == 409
    assert client.post(f"{url}/archive").status_code == 200
    again = client.post(f"{url}/archive")
    assert again.status_code == 409 and again.json()["code"] == "conflict"


def test_patch_on_archived_client_is_409(client: TestClient) -> None:
    created = post(client, VALID).json()
    client.post(f"/api/v1/clients/{created['id']}/archive")
    response = client.patch(f"/api/v1/clients/{created['id']}", json={"city": "Lyon"})
    assert response.status_code == 409
    assert "restaurer" in response.json()["message"]


# --- liste et recherche -----------------------------------------------------------------------


def test_list_is_sorted_by_name_and_searchable(
    client: TestClient, session: Session, clock: Clock
) -> None:
    make_client(session, clock, name="Zèbre SA", kind="company")
    make_client(session, clock, name="Hôtel Élysée")
    make_client(session, clock, name="Alpha")
    names = [c["name"] for c in client.get("/api/v1/clients").json()]
    assert names == ["Alpha", "Hôtel Élysée", "Zèbre SA"]
    found = client.get("/api/v1/clients", params={"q": "elysee"}).json()
    assert [c["name"] for c in found] == ["Hôtel Élysée"]
    assert (
        client.get("/api/v1/clients", params={"q": "   "}).json()
        == client.get("/api/v1/clients").json()
    )


# --- hôte -------------------------------------------------------------------------------------


def test_foreign_host_header_is_refused(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"Host": "evil.example"})
    assert response.status_code == 400


@pytest.mark.parametrize("host", ["localhost:5180", "127.0.0.1:8000", "localhost"])
def test_own_host_names_are_accepted(client: TestClient, host: str) -> None:
    assert client.get("/api/v1/health", headers={"Host": host}).status_code == 200
