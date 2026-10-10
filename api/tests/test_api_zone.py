"""Zones: nested create/list, flat update, archive, delete when empty, reorder (D6c.3)."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_project
from ffe.deps import Clock


@pytest.fixture
def project_id(session: Session, clock: Clock) -> int:
    return make_project(session, clock, name="Hôtel X").id


def post(client: TestClient, project_id: int, body: dict[str, Any]) -> Any:
    return client.post(f"/api/v1/projects/{project_id}/zones", json=body)


def test_create_list_and_default_order(client: TestClient, project_id: int) -> None:
    lobby = post(client, project_id, {"code": "LOB", "name": "Lobby"})
    assert lobby.status_code == 201, lobby.text
    assert (
        lobby.json()["multiplier"] == 1
        and lobby.json()["sortOrder"] == 10
        and lobby.json()["kind"] is None
    )
    rooms = post(
        client,
        project_id,
        {"code": "CHA", "name": "Chambre type A", "kind": "chambre", "multiplier": 12},
    ).json()
    assert rooms["sortOrder"] == 20
    assert [z["code"] for z in client.get(f"/api/v1/projects/{project_id}/zones").json()] == [
        "LOB",
        "CHA",
    ]
    assert client.get(f"/api/v1/zones/{rooms['id']}").json()["multiplier"] == 12
    assert client.get("/api/v1/projects/99/zones").status_code == 404


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"name": "A"}, "code"),
        ({"code": "A"}, "name"),
        ({"code": "A", "name": "A", "multiplier": 0}, "multiplier"),
    ],
)
def test_create_rejects_each_invalid_field(
    client: TestClient, project_id: int, body: dict[str, Any], field: str
) -> None:
    response = post(client, project_id, body)
    assert response.status_code == 422 and response.json()["details"][0]["field"] == field


def test_code_unique_per_project_case_insensitive(
    client: TestClient, project_id: int, session: Session, clock: Clock
) -> None:
    post(client, project_id, {"code": "CHA", "name": "A"})
    dup = post(client, project_id, {"code": "cha", "name": "B"})
    assert dup.status_code == 422 and dup.json()["details"][0]["field"] == "code"
    other = make_project(session, clock, name="Autre").id
    assert post(client, other, {"code": "CHA", "name": "A"}).status_code == 201


def test_update_archive_unarchive_delete(client: TestClient, project_id: int) -> None:
    zone = post(client, project_id, {"code": "CHA", "name": "Chambre A", "multiplier": 12}).json()
    url = f"/api/v1/zones/{zone['id']}"
    updated = client.patch(url, json={"name": "Chambre type A", "multiplier": 14}).json()
    assert updated["name"] == "Chambre type A" and updated["multiplier"] == 14
    assert client.patch(url, json={"multiplier": None}).status_code == 422
    assert client.post(f"{url}/archive").status_code == 200
    assert client.get(f"/api/v1/projects/{project_id}/zones").json() == []
    assert (
        len(
            client.get(
                f"/api/v1/projects/{project_id}/zones", params={"includeArchived": "true"}
            ).json()
        )
        == 1
    )
    assert client.patch(url, json={"name": "x"}).status_code == 409
    assert client.post(f"{url}/unarchive").status_code == 200
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404


def test_closed_project_locks_its_zones(client: TestClient, project_id: int) -> None:
    zone = post(client, project_id, {"code": "LOB", "name": "Lobby"}).json()
    client.post(f"/api/v1/projects/{project_id}/status", json={"status": "closed"})
    assert post(client, project_id, {"code": "CHA", "name": "A"}).status_code == 409
    assert client.patch(f"/api/v1/zones/{zone['id']}", json={"name": "B"}).status_code == 409
    assert client.delete(f"/api/v1/zones/{zone['id']}").status_code == 409


def test_reorder(client: TestClient, project_id: int) -> None:
    ids = [
        post(client, project_id, {"code": c, "name": c}).json()["id"] for c in ("LOB", "CHA", "CHB")
    ]
    reordered = client.post(
        f"/api/v1/projects/{project_id}/zones/reorder", json={"zoneIds": [ids[2], ids[0], ids[1]]}
    )
    assert reordered.status_code == 200
    assert [z["code"] for z in reordered.json()] == ["CHB", "LOB", "CHA"]
    assert [z["sortOrder"] for z in reordered.json()] == [10, 20, 30]
    partial = client.post(f"/api/v1/projects/{project_id}/zones/reorder", json={"zoneIds": ids[:2]})
    assert partial.status_code == 422 and partial.json()["details"][0]["field"] == "zoneIds"
