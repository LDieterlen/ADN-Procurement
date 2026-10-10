"""`/categories`: two-level tree, immutable code/parent, DIV protected, archive rules (D6a.2, D6a.9)."""

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_category
from ffe.deps import Clock

URL = "/api/v1/categories"


def post(client: TestClient, body: dict[str, Any]) -> Any:
    return client.post(URL, json=body)


def test_level1_requires_a_code_and_child_must_not_have_one(client: TestClient) -> None:
    missing = post(client, {"name": "Luminaires"})
    assert missing.status_code == 422 and missing.json()["details"][0]["field"] == "code"
    parent = post(client, {"name": "Luminaires", "code": "lum"}).json()
    assert parent["code"] == "LUM" and parent["parentId"] is None
    with_code = post(client, {"name": "Applique", "parentId": parent["id"], "code": "APP"})
    assert with_code.status_code == 422 and with_code.json()["details"][0]["field"] == "code"
    child = post(client, {"name": "Applique", "parentId": parent["id"]}).json()
    assert child["parentId"] == parent["id"] and child["code"] is None


def test_code_format_and_uniqueness(client: TestClient) -> None:
    assert post(client, {"name": "A", "code": "L"}).status_code == 422
    assert post(client, {"name": "A", "code": "LUMIN"}).status_code == 422
    assert post(client, {"name": "A", "code": "LU1"}).status_code == 422
    post(client, {"name": "Luminaires", "code": "LUM"})
    taken = post(client, {"name": "Lampes", "code": "LUM"})
    assert (
        taken.status_code == 422
        and taken.json()["details"][0]["message"] == "Ce code est déjà utilisé."
    )


def test_only_two_levels(client: TestClient) -> None:
    parent = post(client, {"name": "Luminaires", "code": "LUM"}).json()
    child = post(client, {"name": "Applique", "parentId": parent["id"]}).json()
    grandchild = post(client, {"name": "Applique murale", "parentId": child["id"]})
    assert grandchild.status_code == 422
    assert grandchild.json()["details"][0]["field"] == "parentId"
    assert post(client, {"name": "X", "parentId": 999}).status_code == 422


def test_name_unique_under_the_same_parent_only(client: TestClient) -> None:
    lum = post(client, {"name": "Luminaires", "code": "LUM"}).json()
    dec = post(client, {"name": "Décoration", "code": "DEC"}).json()
    assert post(client, {"name": "Divers", "parentId": lum["id"]}).status_code == 201
    assert post(client, {"name": "Divers", "parentId": dec["id"]}).status_code == 201
    dup = post(client, {"name": "divers", "parentId": lum["id"]})
    assert dup.status_code == 422 and dup.json()["details"][0]["field"] == "name"


def test_list_is_a_flat_tree_ordered_by_sort_order(
    client: TestClient, session: Session, clock: Clock
) -> None:
    lum = make_category(session, clock, name="Luminaires", code="LUM", sort_order=50)
    make_category(session, clock, name="Assises", code="AS", sort_order=10)
    make_category(session, clock, name="Suspension", code=None, parent_id=lum.id, sort_order=20)
    make_category(session, clock, name="Applique", code=None, parent_id=lum.id, sort_order=10)
    names = [c["name"] for c in client.get(URL).json()]
    assert names == ["Assises", "Luminaires", "Applique", "Suspension"]


def test_update_changes_name_and_order_only(client: TestClient) -> None:
    lum = post(client, {"name": "Luminaires", "code": "LUM"}).json()
    updated = client.patch(
        f"{URL}/{lum['id']}", json={"name": "Éclairage", "sortOrder": 5, "code": "XXX"}
    ).json()
    assert updated["name"] == "Éclairage" and updated["sortOrder"] == 5 and updated["code"] == "LUM"


def test_div_cannot_be_archived(client: TestClient) -> None:
    div = post(client, {"name": "Divers", "code": "DIV"}).json()
    response = client.post(f"{URL}/{div['id']}/archive")
    assert response.status_code == 409 and "Divers" in response.json()["message"]


def test_parent_with_active_children_cannot_be_archived(client: TestClient) -> None:
    lum = post(client, {"name": "Luminaires", "code": "LUM"}).json()
    child = post(client, {"name": "Applique", "parentId": lum["id"]}).json()
    blocked = client.post(f"{URL}/{lum['id']}/archive")
    assert blocked.status_code == 409 and "sous-catégories" in blocked.json()["message"]
    assert client.post(f"{URL}/{child['id']}/archive").status_code == 200
    assert client.post(f"{URL}/{lum['id']}/archive").status_code == 200
    assert client.get(URL).json() == []
    assert len(client.get(URL, params={"includeArchived": "true"}).json()) == 2
    restore_child = client.post(f"{URL}/{child['id']}/unarchive")
    assert restore_child.status_code == 409  # parent still archived
    assert client.post(f"{URL}/{lum['id']}/unarchive").status_code == 200
    assert client.post(f"{URL}/{child['id']}/unarchive").status_code == 200


def test_child_under_archived_parent_is_refused(client: TestClient) -> None:
    lum = post(client, {"name": "Luminaires", "code": "LUM"}).json()
    client.post(f"{URL}/{lum['id']}/archive")
    response = post(client, {"name": "Applique", "parentId": lum["id"]})
    assert response.status_code == 422 and response.json()["details"][0]["field"] == "parentId"


def test_unknown_category_is_404(client: TestClient) -> None:
    assert client.get(f"{URL}/3").json()["message"] == "Catégorie n° 3 introuvable."
