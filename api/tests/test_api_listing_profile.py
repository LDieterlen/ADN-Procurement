"""`/listing-profiles` (ADR-0023): five profiles to start with, created, edited, deleted."""

from fastapi.testclient import TestClient

URL = "/api/v1/listing-profiles"


def test_the_starting_profiles_and_the_column_catalogue(client: TestClient) -> None:
    profiles = client.get(URL).json()
    assert [p["name"] for p in profiles] == [
        "Complet",
        "Client",
        "Installation",
        "Achats",
        "Budget",
    ]
    client_profile = profiles[1]
    assert "amount" not in client_profile["columns"] and "supplier" not in client_profile["columns"]
    columns = client.get(f"{URL}/columns").json()
    assert columns[0] == {"key": "photo", "label": "Photo"}
    assert profiles[0]["columns"] == [c["key"] for c in columns]  # « Complet »: every column


def test_a_profile_is_created_edited_and_deleted(client: TestClient) -> None:
    created = client.post(URL, json={"name": " Poseur ", "columns": ["quantity", "code", "code"]})
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["name"] == "Poseur" and body["columns"] == ["code", "quantity"]  # catalogue order
    assert client.get(URL).json()[-1]["id"] == body["id"]  # after the others
    patched = client.patch(f"{URL}/{body['id']}", json={"columns": ["photo", "name"]}).json()
    assert patched["columns"] == ["photo", "name"] and patched["name"] == "Poseur"
    assert client.delete(f"{URL}/{body['id']}").status_code == 204
    assert client.patch(f"{URL}/{body['id']}", json={"name": "x"}).status_code == 404


def test_each_invalid_field_is_named(client: TestClient) -> None:
    taken = client.post(URL, json={"name": "client", "columns": ["code"]})
    assert taken.status_code == 422 and taken.json()["details"][0]["field"] == "name"
    bad = client.post(URL, json={"name": "", "columns": []})
    assert bad.status_code == 422
    assert sorted(d["field"] for d in bad.json()["details"]) == ["columns", "name"]
    unknown = client.post(URL, json={"name": "X", "columns": ["price"]})
    assert unknown.status_code == 422 and unknown.json()["details"][0]["field"].startswith(
        "columns"
    )
