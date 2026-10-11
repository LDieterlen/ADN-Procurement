"""Import de tarifs (ROADMAP F4, ADR-0011) : un tarif xlsx réel généré et un CSV, preview sans
écriture, commit (créés / mis à jour / inchangés / ignorés), mapping réutilisé au second import,
observations de prix, produits disparus."""

from io import BytesIO
from typing import Any

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy.orm import Session

from conftest import make_category, make_manufacturer, make_product, make_supplier
from ffe.deps import Clock
from ffe.imports.price_import import guess_mapping, parse_price_cents


def xlsx(rows: list[list[Any]]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    for row in rows:
        sheet.append(row)
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


HEADER = ["Réf", "Désignation", "Marque", "Réf fabricant", "EAN", "Prix HT", "Délai"]
MAPPING = {
    "columns": {
        "supplierRef": "Réf",
        "name": "Désignation",
        "manufacturerName": "Marque",
        "manufacturerRef": "Réf fabricant",
        "gtin": "EAN",
        "listPrice": "Prix HT",
        "leadTimeWeeks": "Délai",
    },
    "taxMode": "ht",
    "vatBp": None,
    "defaultCategoryId": 1,
    "currency": None,
}


@pytest.fixture
def world(session: Session, clock: Clock) -> dict[str, Any]:
    lum = make_category(session, clock, name="Luminaires", code="LUM")
    dixon = make_supplier(session, clock, name="Tom Dixon", currency="GBP")
    tom = make_manufacturer(session, clock, name="Tom Dixon")
    existing = make_product(
        session,
        clock,
        name="Beat Light Fat",
        category_id=lum.id,
        supplier_id=dixon.id,
        supplier_ref="BLS01",
        manufacturer_id=tom.id,
        manufacturer_ref="BLS01",
        list_price_cents=125_000,
        list_price_currency="GBP",
    )
    old = make_product(
        session,
        clock,
        name="Ancien modèle",
        category_id=lum.id,
        supplier_id=dixon.id,
        supplier_ref="OLD99",
        list_price_cents=10_000,
        list_price_currency="GBP",
    )
    return {"lum": lum, "dixon": dixon, "tom": tom, "existing": existing, "old": old}


def post(client: TestClient, path: str, data: bytes, name: str, fields: dict[str, Any]) -> Any:
    return client.post(
        f"/api/v1/imports/products/{path}",
        files={"file": (name, data, "application/octet-stream")},
        data=fields,
    )


def test_price_parsing_and_header_guessing() -> None:
    assert parse_price_cents("1 250,50") == 125_050 and parse_price_cents("1,250.50") == 125_050
    assert parse_price_cents("€ 1250") == 125_000 and parse_price_cents("12.345,5") == 1_234_550
    assert parse_price_cents("1.250") == 125_000 and parse_price_cents("1,5") == 150
    assert parse_price_cents("0,005") == 1 and parse_price_cents("2.5") == 250  # half up
    assert parse_price_cents("abc") is None and parse_price_cents("-5") is None
    guessed = guess_mapping(["Réf", "Désignation", "Marque", "Prix HT", "Délai (semaines)", "EAN"])
    assert guessed == {
        "name": "Désignation",
        "supplierRef": "Réf",
        "gtin": "EAN",
        "listPrice": "Prix HT",
        "leadTimeWeeks": "Délai (semaines)",
        "manufacturerName": "Marque",
    }


def test_preview_plans_without_writing(client: TestClient, world: dict[str, Any]) -> None:
    data = xlsx(
        [
            HEADER,
            [
                "BLS01",
                "Beat Light Fat",
                "Tom Dixon",
                "BLS01",
                "",
                "1 180,00",
                "10",
            ],  # update (price)
            [
                "BLT01",
                "Beat Light Tall",
                "Tom Dixon",
                "BLT01",
                "5012345678900",
                "1 450",
                "8",
            ],  # create
            ["BLW01", "", "Tom Dixon", "BLW01", "", "900", ""],  # skip: no name
            ["BLX01", "Beat Wide", "Tom Dixon", "BLX01", "", "n/a", ""],  # skip: price unreadable
        ]
    )
    import json

    response = post(
        client,
        "preview",
        data,
        "tarif-2026.xlsx",
        {"supplierId": world["dixon"].id, "mapping": json.dumps(MAPPING)},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert (
        body["columns"] == HEADER
        and body["mappingSource"] == "given"
        and body["mapping"]["currency"] is None
    )
    assert body["counts"] == {
        "total": 4,
        "create": 1,
        "update": 1,
        "unchanged": 0,
        "skip": 2,
        "discontinued": 0,
    }
    rows = {r["supplierRef"]: r for r in body["rows"]}
    assert rows["BLS01"]["action"] == "update" and rows["BLS01"]["matchedBy"] == "manufacturerRef"
    assert rows["BLS01"]["oldPriceCents"] == 125_000 and rows["BLS01"]["newPriceCents"] == 118_000
    assert (
        rows["BLT01"]["action"] == "create"
        and rows["BLT01"]["gtin"] == "5012345678900"
        and rows["BLT01"]["leadTimeWeeks"] == 8
    )
    assert (
        "désignation absente" in rows["BLW01"]["reason"]
        and "prix illisible" in rows["BLX01"]["reason"]
    )
    assert body["missingSupplierRefs"] == ["OLD99"]
    assert (
        client.get(f"/api/v1/products/{world['existing'].id}").json()["listPriceCents"] == 125_000
    )  # untouched
    assert client.get("/api/v1/imports/products/batches").json() == []


def test_commit_then_second_import_reuses_the_saved_mapping(
    client: TestClient, world: dict[str, Any]
) -> None:
    import json

    first = xlsx(
        [
            HEADER,
            ["BLS01", "Beat Light Fat", "Tom Dixon", "BLS01", "", "1 180,00", "10"],
            ["BLT01", "Beat Light Tall", "Flos", "BLT01", "5012345678900", "1 450", "8"],
        ]
    )
    committed = post(
        client,
        "commit",
        first,
        "tarif-2026.xlsx",
        {
            "supplierId": world["dixon"].id,
            "mapping": json.dumps(MAPPING),
            "markMissingDiscontinued": "true",
        },
    )
    assert committed.status_code == 201, committed.text
    body = committed.json()
    assert body["counts"] == {
        "total": 2,
        "create": 1,
        "update": 1,
        "unchanged": 0,
        "skip": 0,
        "discontinued": 1,
    }
    assert (
        body["batch"]["originalName"] == "tarif-2026.xlsx"
        and body["batch"]["rowsDiscontinued"] == 1
    )
    updated = client.get(f"/api/v1/products/{world['existing'].id}").json()
    assert (
        updated["listPriceCents"] == 118_000
        and updated["listPriceCurrency"] == "GBP"
        and updated["leadTimeWeeks"] == 10
    )
    assert updated["listPriceOn"] == "2026-10-09"
    created = client.get(f"/api/v1/products/{body['createdProductIds'][0]}").json()
    assert (
        created["name"] == "Beat Light Tall"
        and created["supplierId"] == world["dixon"].id
        and created["gtin"] == "5012345678900"
    )
    assert (
        created["sourceKind"] == "import"
        and created["categoryId"] == world["lum"].id
        and created["listPriceCents"] == 145_000
    )
    manufacturers = {
        m["name"]: m
        for m in client.get("/api/v1/manufacturers", params={"limit": 50}).json()["items"]
    }
    assert created["manufacturerId"] == manufacturers["Flos"]["id"]  # created from the file
    assert (
        client.get(f"/api/v1/products/{world['old'].id}").json()["discontinuedOn"] == "2026-10-09"
    )
    assert (
        client.get(
            "/api/v1/imports/products/mapping", params={"supplierId": world["dixon"].id}
        ).json()["columns"]["listPrice"]
        == "Prix HT"
    )
    # Second import, CSV this time, without a mapping: the saved one applies; one price unchanged, one updated.
    csv = "Réf;Désignation;Marque;Réf fabricant;EAN;Prix HT;Délai\nBLS01;Beat Light Fat;Tom Dixon;BLS01;;1180,00;10\nBLT01;Beat Light Tall;Flos;BLT01;5012345678900;1500;8\n".encode()
    second = post(client, "commit", csv, "tarif-2027.csv", {"supplierId": world["dixon"].id})
    assert second.status_code == 201, second.text
    assert second.json()["counts"] == {
        "total": 2,
        "create": 0,
        "update": 1,
        "unchanged": 1,
        "skip": 0,
        "discontinued": 0,
    }
    assert client.get(f"/api/v1/products/{created['id']}").json()["listPriceCents"] == 150_000
    batches = client.get(
        "/api/v1/imports/products/batches", params={"supplierId": world["dixon"].id}
    ).json()
    assert [b["originalName"] for b in batches] == ["tarif-2027.csv", "tarif-2026.xlsx"]
    assert client.get(f"/api/v1/files/{batches[0]['fileId']}/content").status_code == 200


def test_import_validation(client: TestClient, world: dict[str, Any]) -> None:
    import json

    data = xlsx([HEADER, ["BLS01", "Beat", "Tom Dixon", "BLS01", "", "1", ""]])
    unknown_col = post(
        client,
        "preview",
        data,
        "t.xlsx",
        {
            "supplierId": world["dixon"].id,
            "mapping": json.dumps(
                {**MAPPING, "columns": {**MAPPING["columns"], "listPrice": "Tarif"}}
            ),
        },
    )
    assert (
        unknown_col.status_code == 422
        and unknown_col.json()["details"][0]["field"] == "mapping.columns.listPrice"
    )
    ttc = post(
        client,
        "preview",
        data,
        "t.xlsx",
        {"supplierId": world["dixon"].id, "mapping": json.dumps({**MAPPING, "taxMode": "ttc"})},
    )
    assert ttc.status_code == 422 and ttc.json()["details"][0]["field"] == "mapping.vatBp"
    no_saved = post(client, "commit", data, "t.xlsx", {"supplierId": world["dixon"].id})
    assert no_saved.status_code == 422 and no_saved.json()["details"][0]["field"] == "mapping"
    guessed = post(client, "preview", data, "t.xlsx", {"supplierId": world["dixon"].id}).json()
    assert (
        guessed["mappingSource"] == "guessed"
        and guessed["mapping"]["columns"]["listPrice"] == "Prix HT"
    )
    assert (
        post(
            client, "preview", b"%PDF-1.4", "tarif.pdf", {"supplierId": world["dixon"].id}
        ).status_code
        == 422
    )
    assert post(client, "preview", data, "t.xlsx", {"supplierId": 999}).status_code == 422
    assert (
        post(client, "preview", b"", "vide.csv", {"supplierId": world["dixon"].id}).status_code
        == 422
    )
