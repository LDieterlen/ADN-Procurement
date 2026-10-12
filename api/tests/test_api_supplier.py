"""`/suppliers`: paginated catalogue list, contact fields, template behaviours."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_supplier
from ffe.deps import Clock

URL = "/api/v1/suppliers"


def post(client: TestClient, body: dict[str, Any], **params: Any) -> Any:
    return client.post(URL, json=body, params=params)


def test_create_with_name_only_and_defaults(client: TestClient) -> None:
    response = post(client, {"name": "Flos SpA"})
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["currency"] == "EUR" and body["defaultDiscountBp"] == 0
    assert body["contactName"] is None and body["email"] is None
    assert client.get(f"{URL}/{body['id']}").json() == body


def test_create_with_contact(client: TestClient) -> None:
    body = post(
        client,
        {
            "name": "Tom Dixon",
            "contactName": " Djamel Sabeur ",
            "email": "djamel@example.com",
            "phone": "06 00 00 00 00",
            "website": "https://tomdixon.net",
            "currency": "GBP",
            "defaultDiscountBp": 1500,
        },
    ).json()
    assert body["currency"] == "GBP" and body["defaultDiscountBp"] == 1500
    assert body["contactName"] == "Djamel Sabeur" and body["website"] == "https://tomdixon.net"


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"name": ""}, "name"),
        ({"name": "A", "currency": "EURO"}, "currency"),
        ({"name": "A", "currency": "eur"}, "currency"),
        ({"name": "A", "defaultDiscountBp": 10001}, "defaultDiscountBp"),
        ({"name": "A", "defaultDiscountBp": -1}, "defaultDiscountBp"),
        ({"name": "A", "email": "x"}, "email"),
    ],
)
def test_create_rejects_each_invalid_field(
    client: TestClient, body: dict[str, Any], field: str
) -> None:
    response = post(client, body)
    assert response.status_code == 422
    assert [d["field"] for d in response.json()["details"]] == [field]


def test_list_is_paginated_with_total(client: TestClient, session: Session, clock: Clock) -> None:
    for i in range(7):
        make_supplier(session, clock, name=f"Fournisseur {i:02d}")
    page = client.get(URL, params={"limit": 3, "offset": 3}).json()
    assert page["total"] == 7
    assert [s["name"] for s in page["items"]] == [
        "Fournisseur 03",
        "Fournisseur 04",
        "Fournisseur 05",
    ]
    assert client.get(URL, params={"limit": 201}).status_code == 422
    assert client.get(URL, params={"offset": -1}).status_code == 422


def test_search_matches_name_and_contact(
    client: TestClient, session: Session, clock: Clock
) -> None:
    make_supplier(session, clock, name="Tom Dixon", contact_name="Djamel Sabeur")
    make_supplier(session, clock, name="Flos", contact_name="Anna Rossi")
    assert [s["name"] for s in client.get(URL, params={"q": "djamel"}).json()["items"]] == [
        "Tom Dixon"
    ]
    assert client.get(URL, params={"q": "flos"}).json()["total"] == 1


def test_duplicate_name_rules_match_client(client: TestClient) -> None:
    first = post(client, {"name": "Tom Dixon"}).json()
    dup = post(client, {"name": "tom  dixon"})
    assert dup.status_code == 409 and dup.json()["existingId"] == first["id"]
    assert post(client, {"name": "tom dixon"}, force="true").status_code == 201
    client.post(f"{URL}/{first['id']}/archive")
    archived = post(client, {"name": "Tom Dixon"}, force="true")
    assert archived.status_code == 409 and archived.json()["archivedId"] == first["id"]


def test_archive_unarchive_and_read_only_when_archived(client: TestClient) -> None:
    created = post(client, {"name": "A"}).json()
    url = f"{URL}/{created['id']}"
    assert client.post(f"{url}/archive").json()["archivedAt"] == "2026-10-09T12:00:00Z"
    assert client.get(URL).json()["total"] == 0
    assert client.get(URL, params={"includeArchived": "true"}).json()["total"] == 1
    assert client.patch(url, json={"phone": "01"}).status_code == 409
    assert client.post(f"{url}/archive").status_code == 409
    assert client.post(f"{url}/unarchive").status_code == 200
    assert client.post(f"{url}/unarchive").status_code == 409


def test_unknown_supplier_is_404(client: TestClient) -> None:
    assert client.get(f"{URL}/9").json()["message"] == "Fournisseur n° 9 introuvable."
