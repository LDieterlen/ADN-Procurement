"""`/products`: catalogue sheet, filters, duplicate by manufacturer reference, file junctions."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import (
    JPEG_BYTES,
    PNG_BYTES,
    make_category,
    make_file,
    make_manufacturer,
    make_product,
    make_supplier,
)
from ffe.config import Settings
from ffe.deps import Clock

URL = "/api/v1/products"


@pytest.fixture
def lum(session: Session, clock: Clock) -> int:
    return make_category(session, clock, name="Luminaires", code="LUM").id


def post(client: TestClient, body: dict[str, Any], **params: Any) -> Any:
    return client.post(URL, json=body, params=params)


def test_create_with_name_and_category_only(client: TestClient, lum: int) -> None:
    response = post(client, {"name": "Beat Light Fat", "categoryId": lum})
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["currency"] == "EUR" and body["listPriceCents"] is None and body["files"] == []
    assert body["reference"] is None and body["dimensions"] is None
    assert client.get(f"{URL}/{body['id']}").json() == body


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"categoryId": 1}, "name"),
        ({"name": "A"}, "categoryId"),
        ({"name": "A", "categoryId": 1, "listPriceCents": -1}, "listPriceCents"),
        ({"name": "A", "categoryId": 1, "currency": "eur"}, "currency"),
        ({"name": "A", "categoryId": 1, "sourceUrl": "ftp://x"}, "sourceUrl"),
    ],
)
def test_create_rejects_each_invalid_field(
    client: TestClient, lum: int, body: dict[str, Any], field: str
) -> None:
    response = post(client, body)
    assert response.status_code == 422
    assert [d["field"] for d in response.json()["details"]] == [field]


def test_references_must_exist_and_be_active(
    client: TestClient, session: Session, clock: Clock, lum: int
) -> None:
    missing = post(client, {"name": "A", "categoryId": 999})
    assert missing.status_code == 422 and missing.json()["details"][0]["field"] == "categoryId"
    archived = make_manufacturer(session, clock, name="Old")
    client.post(f"/api/v1/manufacturers/{archived.id}/archive")
    response = post(client, {"name": "A", "categoryId": lum, "manufacturerId": archived.id})
    assert response.status_code == 422
    assert response.json()["details"] == [
        {"field": "manufacturerId", "message": "Le fabricant est archivé."}
    ]


def test_duplicate_manufacturer_reference(
    client: TestClient, session: Session, clock: Clock, lum: int
) -> None:
    flos = make_manufacturer(session, clock, name="Flos")
    first = post(
        client,
        {"name": "Arco", "categoryId": lum, "manufacturerId": flos.id, "reference": "F0300"},
    ).json()
    dup = post(
        client,
        {
            "name": "Arco noir",
            "categoryId": lum,
            "manufacturerId": flos.id,
            "reference": " f0300 ",
        },
    )
    assert (
        dup.status_code == 409
        and dup.json()["code"] == "duplicate"
        and dup.json()["existingId"] == first["id"]
    )
    forced = post(
        client,
        {
            "name": "Arco noir",
            "categoryId": lum,
            "manufacturerId": flos.id,
            "reference": "F0300",
        },
        force="true",
    )
    assert forced.status_code == 201  # same reference, other finish
    assert (
        post(client, {"name": "Sans ref", "categoryId": lum, "manufacturerId": flos.id}).status_code
        == 201
    )


def test_list_filters_and_search(
    client: TestClient, session: Session, clock: Clock, lum: int
) -> None:
    tab = make_category(session, clock, name="Tables", code="TAB").id
    flos = make_manufacturer(session, clock, name="Flos")
    dixon = make_supplier(session, clock, name="Tom Dixon")
    make_product(
        session,
        clock,
        name="Arco",
        category_id=lum,
        manufacturer_id=flos.id,
        reference="F0300",
    )
    make_product(
        session,
        clock,
        name="Beat Light",
        category_id=lum,
        supplier_id=dixon.id,
        reference="BLS03",
    )
    make_product(session, clock, name="Table Tulip", category_id=tab)
    names = lambda params: [p["name"] for p in client.get(URL, params=params).json()["items"]]  # noqa: E731
    assert names({}) == ["Arco", "Beat Light", "Table Tulip"]
    assert names({"categoryId": lum}) == ["Arco", "Beat Light"]
    assert names({"manufacturerId": flos.id}) == ["Arco"]
    assert names({"supplierId": dixon.id}) == ["Beat Light"]
    assert names({"q": "bls"}) == ["Beat Light"]
    assert names({"q": "f0300"}) == ["Arco"]
    assert client.get(URL, params={"limit": 2}).json()["total"] == 3


def test_patch_and_archive_cycle(client: TestClient, lum: int) -> None:
    created = post(client, {"name": "A", "categoryId": lum}).json()
    url = f"{URL}/{created['id']}"
    body = client.patch(
        url, json={"finish": "laiton", "dimensions": "Ø 36 cm", "listPriceCents": 125000}
    ).json()
    assert (
        body["finish"] == "laiton"
        and body["dimensions"] == "Ø 36 cm"
        and body["listPriceCents"] == 125000
    )
    assert client.patch(url, json={"categoryId": None}).status_code == 422
    assert client.post(f"{url}/archive").status_code == 200
    assert client.get(URL).json()["total"] == 0
    assert client.get(URL, params={"includeArchived": "true"}).json()["total"] == 1
    assert client.patch(url, json={"finish": "x"}).status_code == 409
    assert client.post(f"{url}/unarchive").status_code == 200


# --- fichiers ---------------------------------------------------------------------------------


def test_attach_primary_update_and_detach(
    client: TestClient, session: Session, settings: Settings, clock: Clock, lum: int
) -> None:
    product = post(client, {"name": "A", "categoryId": lum}).json()
    photo = make_file(session, settings, clock, PNG_BYTES, "a.png")
    photo2 = make_file(session, settings, clock, JPEG_BYTES, "b.jpg")
    url = f"{URL}/{product['id']}/files"

    attached = client.post(url, json={"fileId": photo.id, "isPrimary": True})
    assert attached.status_code == 201, attached.text
    files = attached.json()["files"]
    assert len(files) == 1 and files[0]["isPrimary"] is True and files[0]["ext"] == "png"
    assert files[0]["fileId"] == photo.id and files[0]["originalName"] == "a.png"

    assert client.post(url, json={"fileId": photo.id}).status_code == 409  # already attached
    assert client.post(url, json={"fileId": 999}).status_code == 404

    second = client.post(
        url, json={"fileId": photo2.id, "isPrimary": True, "caption": "Vue 2"}
    ).json()["files"]
    assert [f["isPrimary"] for f in second] == [False, True]  # the new primary replaces the old one

    not_image = client.post(url, json={"fileId": photo2.id, "kind": "datasheet", "isPrimary": True})
    assert not_image.status_code == 409  # already attached wins; now test kind rule on update
    bad = client.patch(f"{url}/{photo2.id}", json={"kind": "datasheet"})
    assert bad.status_code == 422 and bad.json()["details"][0]["field"] == "isPrimary"
    moved = client.patch(f"{url}/{photo.id}", json={"isPrimary": True, "sortOrder": 5}).json()[
        "files"
    ]
    assert [(f["fileId"], f["isPrimary"]) for f in moved] == [(photo2.id, False), (photo.id, True)]

    detached = client.delete(f"{url}/{photo2.id}")
    assert detached.status_code == 200 and [f["fileId"] for f in detached.json()["files"]] == [
        photo.id
    ]
    assert not (settings.files_dir / photo2.filename).exists()  # orphan: bytes and row gone
    assert client.get(f"/api/v1/files/{photo2.id}/content").status_code == 404
    assert client.delete(f"{url}/{photo2.id}").status_code == 409


def test_detach_keeps_a_file_shared_by_two_products(
    client: TestClient, session: Session, settings: Settings, clock: Clock, lum: int
) -> None:
    a = post(client, {"name": "A", "categoryId": lum}).json()["id"]
    b = post(client, {"name": "B", "categoryId": lum}).json()["id"]
    photo = make_file(session, settings, clock)
    client.post(f"{URL}/{a}/files", json={"fileId": photo.id})
    client.post(f"{URL}/{b}/files", json={"fileId": photo.id})
    client.delete(f"{URL}/{a}/files/{photo.id}")
    assert (settings.files_dir / photo.filename).exists()
    assert client.get(f"/api/v1/files/{photo.id}/content").status_code == 200


def test_list_rows_carry_their_files(
    client: TestClient, session: Session, settings: Settings, clock: Clock, lum: int
) -> None:
    product = post(client, {"name": "A", "categoryId": lum}).json()
    photo = make_file(session, settings, clock)
    client.post(f"{URL}/{product['id']}/files", json={"fileId": photo.id, "isPrimary": True})
    rows = client.get(URL).json()["items"]
    assert rows[0]["files"][0]["sha256"] == photo.sha256
