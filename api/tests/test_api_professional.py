"""`/professionals`: paginated list, service duplicate rule and the lower(name) index net."""

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.orm import Session

from conftest import make_professional
from ffe.deps import Clock
from ffe.models import Professional

URL = "/api/v1/professionals"
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
        make_professional(session, clock, name=name)
    page = client.get(URL, params={"limit": 2}).json()
    assert page["total"] == 4 and [m["name"] for m in page["items"]] == ["Artemide", "Flos"]
    assert client.get(URL, params={"q": "VIT"}).json()["items"][0]["name"] == "Vitra"


def test_service_detects_accented_duplicates(client: TestClient) -> None:
    first = post(client, {"name": "Établissements Dupont"}).json()
    dup = post(client, {"name": "etablissements  dupont"})
    assert dup.status_code == 409 and dup.json()["existingId"] == first["id"]
    assert post(client, {"name": "etablissements dupont"}, force="true").status_code == 201


def test_lower_name_index_is_the_last_resort_net(session: Session, clock: Clock) -> None:
    make_professional(session, clock, name="Flos")
    import pytest
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError, match="uq_professional_name_lower"), session.begin():
        session.execute(insert(Professional).values(name="FLOS", created_at=NOW, updated_at=NOW))


def test_archive_cycle(client: TestClient) -> None:
    created = post(client, {"name": "Hay"}).json()
    url = f"{URL}/{created['id']}"
    assert client.post(f"{url}/archive").status_code == 200
    assert client.get(URL).json()["total"] == 0
    assert client.post(f"{url}/unarchive").status_code == 200
    assert client.get(URL).json()["total"] == 1


def test_unknown_professional_is_404(client: TestClient) -> None:
    assert client.get(f"{URL}/5").json()["message"] == "Professionnel n° 5 introuvable."


def test_kind_defaults_to_manufacturer_and_is_checked(client: TestClient) -> None:
    body = post(client, {"name": "Jouffre", "specialty": "Confection"}).json()
    assert body["kind"] == "manufacturer" and body["specialty"] == "Confection"
    assert post(client, {"name": "X", "kind": "plumber"}).status_code == 422
    updated = client.patch(
        f"{URL}/{body['id']}",
        json={"kind": "artisan", "contact2Name": "Nadia", "contact2Email": "nadia@example.com"},
    ).json()
    assert updated["kind"] == "artisan" and updated["contact2Email"] == "nadia@example.com"
    assert client.patch(f"{URL}/{body['id']}", json={"contact2Email": "x"}).status_code == 422


def test_filter_by_kind_and_specialty(client: TestClient, session: Session, clock: Clock) -> None:
    make_professional(session, clock, name="Jouffre", kind="manufacturer", specialty="Confection")
    make_professional(session, clock, name="Dedar", kind="publisher", specialty="Tissu")
    make_professional(session, clock, name="Casamance", kind="publisher", specialty="Tissu")
    assert client.get(f"{URL}/specialties").json() == ["Confection", "Tissu"]
    assert client.get(URL, params={"kind": "publisher"}).json()["total"] == 2
    page = client.get(URL, params={"kind": "publisher", "specialty": "tissu", "q": "ded"}).json()
    assert [m["name"] for m in page["items"]] == ["Dedar"]
    assert client.get(URL, params={"kind": "plumber"}).json()["total"] == 0  # unknown prestation
