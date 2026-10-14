"""`/choices`: editable value lists (family, usage, prestation) and their use by the services."""

from typing import Any

from fastapi.testclient import TestClient

from ffe.models.choice import DEFAULT_CHOICES

URL = "/api/v1/choices"


def names(client: TestClient, list_name: str, **params: Any) -> list[str]:
    return [c["name"] for c in client.get(URL, params={"list": list_name, **params}).json()]


def test_lists_start_with_the_former_fixed_values(client: TestClient) -> None:
    for list_name, values in DEFAULT_CHOICES.items():
        rows = client.get(URL, params={"list": list_name}).json()
        assert [(c["code"], c["name"]) for c in rows] == list(values)


def test_create_rename_archive_a_value(client: TestClient) -> None:
    created = client.post(URL, json={"list": "family", "name": " Luminaire d'art "})
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["code"] == "luminaire-d-art" and body["name"] == "Luminaire d'art"
    assert names(client, "family")[-1] == "Luminaire d'art"  # after the last one
    twin = client.post(URL, json={"list": "family", "name": "LUMINAIRE D'ART"})
    assert twin.status_code == 422 and twin.json()["details"][0]["field"] == "name"
    renamed = client.patch(f"{URL}/{body['id']}", json={"name": "Lumière"}).json()
    assert renamed["name"] == "Lumière" and renamed["code"] == "luminaire-d-art"  # code kept
    assert client.post(f"{URL}/{body['id']}/archive").status_code == 200
    assert "Lumière" not in names(client, "family")
    assert "Lumière" in names(client, "family", includeArchived=True)
    assert client.post(URL, json={"list": "colour", "name": "x"}).status_code == 422


def test_articles_and_professionals_take_only_active_values(
    client: TestClient, session: Any, clock: Any
) -> None:
    from conftest import make_category, make_project

    project = make_project(session, clock)
    category = make_category(session, clock, name="Assise", code="AS")
    usage = client.post(URL, json={"list": "usage", "name": "Terrasse couverte"}).json()
    base = f"/api/v1/projects/{project.id}/project-items"
    item = client.post(
        base, json={"name": "Chaise", "categoryId": category.id, "usage": usage["code"]}
    )
    assert item.status_code == 201, item.text and item.json()["usage"] == usage["code"]
    refused = client.post(base, json={"name": "B", "categoryId": category.id, "family": "nope"})
    assert refused.status_code == 422 and refused.json()["details"][0]["field"] == "family"
    client.post(f"{URL}/{usage['id']}/archive")
    again = client.post(base, json={"name": "C", "categoryId": category.id, "usage": usage["code"]})
    assert again.status_code == 422  # archived: no longer offered
    prestation = client.post(URL, json={"list": "prestation", "name": "Ébéniste"}).json()
    pro = client.post(
        "/api/v1/professionals", json={"name": "Atelier X", "kind": prestation["code"]}
    )
    assert pro.status_code == 201 and pro.json()["kind"] == "ebeniste"
