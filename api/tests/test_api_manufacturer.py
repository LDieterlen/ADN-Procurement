"""`/manufacturers`: paginated list, service duplicate rule and the lower(name) index net."""

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.orm import Session

from conftest import make_manufacturer
from ffe.deps import Clock
from ffe.models import Manufacturer

URL = "/api/v1/manufacturers"
NOW = "2026-10-09T12:00:00Z"


def post(client: TestClient, body: dict[str, Any], **params: Any) -> Any:
    return client.post(URL, json=body, params=params)


def test_create_read_update(client: TestClient) -> None:
    created = post(client, {"name": " Flos ", "website": "https://flos.com"})
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Flos"
    updated = client.patch(f"{URL}/{body['id']}", json={"notes": "Italie"}).json()
    assert updated["notes"] == "Italie" and updated["website"] == "https://flos.com"
    assert client.patch(f"{URL}/{body['id']}", json={"name": None}).status_code == 422


def test_list_paginated_and_searchable(client: TestClient, session: Session, clock: Clock) -> None:
    for name in ("Vitra", "Flos", "Hay", "Artemide"):
        make_manufacturer(session, clock, name=name)
    page = client.get(URL, params={"limit": 2}).json()
    assert page["total"] == 4 and [m["name"] for m in page["items"]] == ["Artemide", "Flos"]
    assert client.get(URL, params={"q": "VIT"}).json()["items"][0]["name"] == "Vitra"


def test_service_detects_accented_duplicates(client: TestClient) -> None:
    first = post(client, {"name": "Établissements Dupont"}).json()
    dup = post(client, {"name": "etablissements  dupont"})
    assert dup.status_code == 409 and dup.json()["existingId"] == first["id"]
    assert post(client, {"name": "etablissements dupont"}, force="true").status_code == 201


def test_lower_name_index_is_the_last_resort_net(session: Session, clock: Clock) -> None:
    make_manufacturer(session, clock, name="Flos")
    import pytest
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError, match="uq_manufacturer_name_lower"), session.begin():
        session.execute(insert(Manufacturer).values(name="FLOS", created_at=NOW, updated_at=NOW))


def test_archive_cycle(client: TestClient) -> None:
    created = post(client, {"name": "Hay"}).json()
    url = f"{URL}/{created['id']}"
    assert client.post(f"{url}/archive").status_code == 200
    assert client.get(URL).json()["total"] == 0
    assert client.post(f"{url}/unarchive").status_code == 200
    assert client.get(URL).json()["total"] == 1


def test_unknown_manufacturer_is_404(client: TestClient) -> None:
    assert client.get(f"{URL}/5").json()["message"] == "Fabricant n° 5 introuvable."
