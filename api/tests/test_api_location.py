"""`/projects/{id}/locations` and `/locations/{id}`: code unique per project, zone and level,
reorder, delete only when empty, read-only when the project is closed."""

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_item, make_location, make_project
from ffe.deps import Clock


def url(project_id: int) -> str:
    return f"/api/v1/projects/{project_id}/locations"


def post(client: TestClient, project_id: int, body: dict[str, Any]) -> Any:
    return client.post(url(project_id), json=body)


def test_create_reads_defaults_and_orders_after_the_last(
    client: TestClient, session: Session, clock: Clock
) -> None:
    project = make_project(session, clock)
    first = post(
        client,
        project.id,
        {"code": "lob", "name": "Lobby", "zone": " Zones communes ", "level": "R0"},
    )
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["multiplier"] == 1 and body["sortOrder"] == 10 and body["zone"] == "Zones communes"
    second = post(
        client, project.id, {"code": "CHA", "name": "Chambre typo A", "multiplier": 24, "zone": ""}
    ).json()
    assert second["sortOrder"] == 20 and second["zone"] is None
    assert [z["code"] for z in client.get(url(project.id)).json()] == ["lob", "CHA"]


def test_code_unique_per_project_ignoring_case(
    client: TestClient, session: Session, clock: Clock
) -> None:
    project = make_project(session, clock)
    other = make_project(session, clock)
    post(client, project.id, {"code": "CHA", "name": "A"})
    dup = post(client, project.id, {"code": "cha", "name": "B"})
    assert dup.status_code == 422 and dup.json()["details"][0]["field"] == "code"
    assert post(client, other.id, {"code": "CHA", "name": "C"}).status_code == 201


def test_patch_multiplier_and_clear_level(
    client: TestClient, session: Session, clock: Clock
) -> None:
    project = make_project(session, clock)
    location = make_location(session, clock, project.id, level="R+1")
    patched = client.patch(
        f"/api/v1/locations/{location.id}", json={"multiplier": 30, "level": None}
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["multiplier"] == 30 and patched.json()["level"] is None
    assert (
        client.patch(f"/api/v1/locations/{location.id}", json={"multiplier": 0}).status_code == 422
    )


def test_reorder_requires_exactly_the_active_locations(
    client: TestClient, session: Session, clock: Clock
) -> None:
    project = make_project(session, clock)
    a = make_location(session, clock, project.id, code="A", name="A")
    b = make_location(session, clock, project.id, code="B", name="B")
    reordered = client.post(f"{url(project.id)}/reorder", json={"locationIds": [b.id, a.id]})
    assert [z["id"] for z in reordered.json()] == [b.id, a.id]
    assert reordered.json()[0]["sortOrder"] == 10
    bad = client.post(f"{url(project.id)}/reorder", json={"locationIds": [a.id]})
    assert bad.status_code == 422


def test_delete_only_when_empty_else_archive(
    client: TestClient, session: Session, clock: Clock
) -> None:
    project = make_project(session, clock)
    empty = make_location(session, clock, project.id, code="EMP", name="Vide")
    used = make_location(session, clock, project.id, code="USE", name="Occupée")
    make_item(session, clock, project.id, placements=[{"location_id": used.id}])
    assert client.delete(f"/api/v1/locations/{empty.id}").status_code == 204
    blocked = client.delete(f"/api/v1/locations/{used.id}")
    assert blocked.status_code == 409 and "implantation" in blocked.json()["message"]
    assert client.post(f"/api/v1/locations/{used.id}/archive").status_code == 200
    assert client.get(url(project.id)).json() == []
    assert len(client.get(url(project.id), params={"includeArchived": "true"}).json()) == 1
    assert client.post(f"/api/v1/locations/{used.id}/unarchive").status_code == 200
    with_sheet = make_location(session, clock, project.id, code="SHT", name="Planche")
    client.post(
        f"/api/v1/projects/{project.id}/installation-sheets",
        json={"locationId": with_sheet.id, "name": "Coin TV"},
    )
    refused = client.delete(f"/api/v1/locations/{with_sheet.id}")
    assert refused.status_code == 409 and "planche" in refused.json()["message"]


def test_closed_project_is_read_only(client: TestClient, session: Session, clock: Clock) -> None:
    project = make_project(session, clock)
    location = make_location(session, clock, project.id)
    client.post(f"/api/v1/projects/{project.id}/status", json={"status": "closed"})
    assert post(client, project.id, {"code": "X", "name": "X"}).status_code == 409
    assert client.patch(f"/api/v1/locations/{location.id}", json={"name": "Y"}).status_code == 409
    assert client.get(f"/api/v1/locations/{location.id}").json()["name"] == "Chambre typo A"
    assert client.get("/api/v1/locations/999").status_code == 404
