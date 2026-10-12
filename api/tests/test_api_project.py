"""`/projects`: generated codes, status as archiving, client rules (D6c.1, D6c.2)."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from conftest import make_client, make_project
from ffe.deps import Clock

URL = "/api/v1/projects"


@pytest.fixture
def client_id(session: Session, clock: Clock) -> int:
    return make_client(session, clock, name="Hôtel X SA", kind="company").id


def post(client: TestClient, body: dict[str, Any]) -> Any:
    return client.post(URL, json=body)


def test_create_generates_a_yearly_code_and_copies_the_vat_default(
    client: TestClient, client_id: int
) -> None:
    first = post(client, {"name": "Rénovation étages", "clientId": client_id})
    assert first.status_code == 201, first.text
    body = first.json()
    assert (
        body["code"] == "2026-001" and body["status"] == "prospect" and body["defaultVatBp"] == 2000
    )
    second = post(client, {"name": "Spa", "clientId": client_id}).json()
    assert second["code"] == "2026-002"
    custom = post(
        client, {"name": "Villa", "clientId": client_id, "code": "VILLA-1", "defaultVatBp": 1000}
    ).json()
    assert custom["code"] == "VILLA-1" and custom["defaultVatBp"] == 1000
    third = post(client, {"name": "Suite", "clientId": client_id}).json()
    assert third["code"] == "2026-003"  # custom codes do not disturb the sequence


def test_code_prefix_from_settings(client: TestClient, engine: Engine, client_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(text("UPDATE setting SET project_code_prefix = 'P' WHERE id = 1"))
    assert post(client, {"name": "A", "clientId": client_id}).json()["code"] == "P2026-001"


def test_code_must_be_unique(client: TestClient, client_id: int) -> None:
    post(client, {"name": "A", "clientId": client_id, "code": "X-1"})
    dup = post(client, {"name": "B", "clientId": client_id, "code": "X-1"})
    assert dup.status_code == 422 and dup.json()["details"][0]["field"] == "code"


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"clientId": 1}, "name"),
        ({"name": "A"}, "clientId"),
        ({"name": "A", "clientId": 1, "defaultVatBp": 10001}, "defaultVatBp"),
        ({"name": "A", "clientId": 1, "startOn": "2026-13-01"}, "startOn"),
        ({"name": "A", "clientId": 1, "startOn": "2026-12-01", "dueOn": "2026-01-01"}, "body"),
        ({"name": "A", "clientId": 999}, "clientId"),
    ],
)
def test_create_rejects_each_invalid_field(
    client: TestClient, client_id: int, body: dict[str, Any], field: str
) -> None:
    response = post(client, body)
    assert response.status_code == 422, response.text
    assert response.json()["details"][0]["field"] == field


def test_archived_client_is_refused(client: TestClient, session: Session, clock: Clock) -> None:
    archived = make_client(session, clock, name="Parti")
    client.post(f"/api/v1/clients/{archived.id}/archive")
    response = post(client, {"name": "A", "clientId": archived.id})
    assert (
        response.status_code == 422
        and response.json()["details"][0]["message"] == "Le client est archivé."
    )


def test_status_change_and_read_only_when_closed(client: TestClient, client_id: int) -> None:
    project = post(client, {"name": "A", "clientId": client_id}).json()
    url = f"{URL}/{project['id']}"
    assert client.post(f"{url}/status", json={"status": "active"}).json()["status"] == "active"
    assert client.post(f"{url}/status", json={"status": "nope"}).status_code == 422
    assert client.post(f"{url}/status", json={"status": "closed"}).status_code == 200
    locked = client.patch(url, json={"name": "B"})
    assert locked.status_code == 409 and "rouvrir" in locked.json()["message"]
    assert client.post(f"{url}/status", json={"status": "active"}).status_code == 200
    assert client.patch(url, json={"name": "B", "dueOn": "2027-06-30"}).json()["name"] == "B"
    assert client.get(URL, params={"status": "active"}).json()[0]["id"] == project["id"]


def test_client_with_open_project_cannot_be_archived(client: TestClient, client_id: int) -> None:
    project = post(client, {"name": "A", "clientId": client_id}).json()
    blocked = client.post(f"/api/v1/clients/{client_id}/archive")
    assert blocked.status_code == 409 and "non clos" in blocked.json()["message"]
    client.post(f"{URL}/{project['id']}/status", json={"status": "closed"})
    assert client.post(f"/api/v1/clients/{client_id}/archive").status_code == 200


def test_list_filters_by_client_and_orders_by_code_desc(
    client: TestClient, session: Session, clock: Clock
) -> None:
    a = make_project(session, clock, name="A")
    b = make_project(session, clock, name="B")
    codes = [p["code"] for p in client.get(URL).json()]
    assert codes == ["2026-002", "2026-001"]
    assert [p["id"] for p in client.get(URL, params={"clientId": b.client_id}).json()] == [b.id]
    assert client.get(f"{URL}/{a.id}").json()["name"] == "A"
    assert client.get(f"{URL}/99").status_code == 404


def test_global_budget_can_be_created_with_the_project(
    client: TestClient, session: Session, clock: Clock
) -> None:
    owner = make_client(session, clock)
    created = client.post(
        "/api/v1/projects",
        json={"name": "Villa", "clientId": owner.id, "globalBudgetCents": 5_000_000},
    )
    assert created.status_code == 201, created.text
    lines = client.get(f"/api/v1/projects/{created.json()['id']}/budget-lines").json()
    assert [(b["zoneId"], b["categoryId"], b["amountCents"]) for b in lines] == [
        (None, None, 5_000_000)
    ]
    without = client.post(
        "/api/v1/projects", json={"name": "Sans budget", "clientId": owner.id}
    ).json()
    assert client.get(f"/api/v1/projects/{without['id']}/budget-lines").json() == []
