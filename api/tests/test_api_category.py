"""`/categories`: the product types — code immutable and unique, name unique, archive (ADR-0013)."""

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_category
from ffe.deps import Clock

URL = "/api/v1/categories"


def post(client: TestClient, body: dict[str, Any]) -> Any:
    return client.post(URL, json=body)


def test_create_requires_a_code_and_uppercases_it(client: TestClient) -> None:
    missing = post(client, {"name": "Luminaire"})
    assert missing.status_code == 422 and missing.json()["details"][0]["field"] == "code"
    created = post(client, {"name": "Luminaire", "code": "lud"})
    assert created.status_code == 201, created.text
    assert created.json()["code"] == "LUD" and created.json()["sortOrder"] == 0


def test_code_format_and_uniqueness(client: TestClient) -> None:
    assert post(client, {"name": "A", "code": "L"}).status_code == 422
    assert post(client, {"name": "A", "code": "LUMIN"}).status_code == 422
    assert post(client, {"name": "A", "code": "LU1"}).status_code == 422
    post(client, {"name": "Luminaire", "code": "LUM"})
    taken = post(client, {"name": "Lampes", "code": "LUM"})
    assert (
        taken.status_code == 422
        and taken.json()["details"][0]["message"] == "Ce code est déjà utilisé."
    )


def test_name_unique_ignoring_case_and_accents(client: TestClient) -> None:
    post(client, {"name": "Décoration", "code": "DEC"})
    dup = post(client, {"name": "decoration", "code": "DE"})
    assert dup.status_code == 422 and dup.json()["details"][0]["field"] == "name"


def test_list_is_ordered_by_sort_order(client: TestClient, session: Session, clock: Clock) -> None:
    make_category(session, clock, name="Luminaire", code="LUM", sort_order=50)
    make_category(session, clock, name="Assise", code="AS", sort_order=10)
    assert [c["name"] for c in client.get(URL).json()] == ["Assise", "Luminaire"]


def test_update_changes_name_and_order_only(client: TestClient) -> None:
    lum = post(client, {"name": "Luminaire", "code": "LUM"}).json()
    updated = client.patch(
        f"{URL}/{lum['id']}", json={"name": "Éclairage", "sortOrder": 5, "code": "XXX"}
    ).json()
    assert updated["name"] == "Éclairage" and updated["sortOrder"] == 5 and updated["code"] == "LUM"
    assert client.patch(f"{URL}/{lum['id']}", json={"name": None}).status_code == 422


def test_archive_and_unarchive(client: TestClient) -> None:
    lum = post(client, {"name": "Luminaire", "code": "LUM"}).json()
    assert client.post(f"{URL}/{lum['id']}/archive").status_code == 200
    assert client.get(URL).json() == []
    assert len(client.get(URL, params={"includeArchived": "true"}).json()) == 1
    assert client.patch(f"{URL}/{lum['id']}", json={"name": "X"}).status_code == 409
    assert client.post(f"{URL}/{lum['id']}/unarchive").status_code == 200


def test_unknown_category_is_404(client: TestClient) -> None:
    assert client.get(f"{URL}/3").json()["message"] == "Type de produit n° 3 introuvable."
