"""Devis (ROADMAP étape 10a, ADR-0006) : 2 devis pour une ligne, un retenu, le prix change et
l'historique l'enregistre ; une seule ligne retenue par article ; refus après commande."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import PNG_BYTES, make_category, make_product, make_project, make_supplier, make_zone
from ffe.deps import Clock

GBP = 1_170_000


@pytest.fixture
def world(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    project = make_project(session, clock, name="Hôtel X")
    cha = make_zone(session, clock, project.id, code="CHA", name="Chambre type A", multiplier=12)
    lum = make_category(session, clock, name="Luminaires", code="LUM")
    dixon = make_supplier(
        session, clock, name="Tom Dixon", currency="GBP", default_discount_bp=1500
    )
    flos = make_supplier(session, clock, name="Flos SpA", country_code="IT", currency="EUR")
    lamp = make_product(
        session,
        clock,
        name="Beat Light Fat",
        category_id=lum.id,
        supplier_id=dixon.id,
        list_price_cents=125_000,
        list_price_currency="GBP",
    )
    item = client.post(
        f"/api/v1/projects/{project.id}/project-items",
        json={
            "productId": lamp.id,
            "fxRateMicro": GBP,
            "placements": [{"zoneId": cha.id, "qtyMilli": 1000}],
        },
    ).json()
    return {"project": project, "cha": cha, "dixon": dixon, "flos": flos, "item": item}


def post_quote(client: TestClient, project_id: int, body: dict[str, Any]) -> Any:
    return client.post(f"/api/v1/projects/{project_id}/quotes", json=body)


def two_quotes(client: TestClient, world: dict[str, Any]) -> tuple[Any, Any]:
    p, item = world["project"].id, world["item"]
    dixon = post_quote(
        client,
        p,
        {
            "supplierId": world["dixon"].id,
            "reference": "TD-2026-118",
            "quotedOn": "2026-10-01",
            "validUntil": "2026-11-30",
            "lines": [
                {
                    "projectItemId": item["id"],
                    "unitCostCents": 118_000,
                    "discountBp": 1500,
                    "leadTimeWeeks": 10,
                }
            ],
        },
    )
    flos = post_quote(
        client,
        p,
        {
            "supplierId": world["flos"].id,
            "reference": "FL-1",
            "lines": [{"projectItemId": item["id"], "unitCostCents": 110_000}],
        },
    )
    assert dixon.status_code == 201, dixon.text
    assert flos.status_code == 201, flos.text
    return dixon.json(), flos.json()


def test_create_quote_defaults_currency_and_rate_and_computes_net(
    client: TestClient, world: dict[str, Any]
) -> None:
    dixon, flos = two_quotes(client, world)
    assert dixon["currency"] == "GBP" and dixon["fxRateMicro"] == GBP  # last rate of the project
    assert dixon["supplierName"] == "Tom Dixon" and dixon["retainedCount"] == 0
    line = dixon["lines"][0]
    assert line["itemCode"] == "CHA-LUM-01" and line["netUnitCents"] == 100_300
    assert line["netUnitEurCents"] == 117_351  # (100 300 × 1 170 000 + 500 000) / 10⁶
    assert flos["currency"] == "EUR" and flos["fxRateMicro"] == 1_000_000
    assert flos["lines"][0]["netUnitEurCents"] == 110_000
    assert [
        q["reference"] for q in client.get(f"/api/v1/projects/{world['project'].id}/quotes").json()
    ] == ["TD-2026-118", "FL-1"]


def test_quote_validation_field_by_field(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    two_quotes(client, world)
    duplicate = post_quote(
        client, p, {"supplierId": world["dixon"].id, "reference": " TD-2026-118 "}
    )
    assert duplicate.status_code == 422 and duplicate.json()["details"][0]["field"] == "reference"
    wrong_item = post_quote(
        client,
        p,
        {
            "supplierId": world["flos"].id,
            "reference": "FL-2",
            "lines": [{"projectItemId": 999, "unitCostCents": 1}],
        },
    )
    assert wrong_item.status_code == 422
    assert wrong_item.json()["details"][0]["field"] == "lines.0.projectItemId"
    dates = post_quote(
        client,
        p,
        {
            "supplierId": world["flos"].id,
            "reference": "FL-3",
            "quotedOn": "2026-10-10",
            "validUntil": "2026-10-01",
        },
    )
    assert dates.status_code == 422
    unknown_supplier = post_quote(client, p, {"supplierId": 999, "reference": "X"})
    assert unknown_supplier.json()["details"][0]["field"] == "supplierId"
    eur_rate = post_quote(
        client, p, {"supplierId": world["flos"].id, "reference": "FL-4", "fxRateMicro": 2}
    )
    assert eur_rate.json()["details"][0]["field"] == "fxRateMicro"
    client.post(f"/api/v1/projects/{p}/status", json={"status": "closed"})
    assert (
        post_quote(client, p, {"supplierId": world["flos"].id, "reference": "FL-5"}).status_code
        == 409
    )


def test_retain_copies_the_quote_onto_the_line_and_journals_it(
    client: TestClient, world: dict[str, Any]
) -> None:
    dixon, flos = two_quotes(client, world)
    item_id = world["item"]["id"]
    comparison = client.get(f"/api/v1/project-items/{item_id}/quotes").json()
    assert [(c["supplierName"], c["netUnitEurCents"], c["retained"]) for c in comparison] == [
        ("Tom Dixon", 117_351, False),
        ("Flos SpA", 110_000, False),
    ]
    retained = client.post(f"/api/v1/quote-lines/{flos['lines'][0]['id']}/retain")
    assert retained.status_code == 200, retained.text
    item = retained.json()
    assert item["supplierId"] == world["flos"].id and item["unitCostCents"] == 110_000
    assert item["currency"] == "EUR" and item["fxRateMicro"] == 1_000_000
    assert item["discountBp"] == 0 and item["quoteRef"] == "FL-1" and item["status"] == "quoted"
    events = client.get(f"/api/v1/project-items/{item_id}/events").json()
    kinds = [e["kind"] for e in events]
    assert kinds == ["created", "quote", "status"]
    quote_event = events[1]
    assert quote_event["note"] == "Devis FL-1 (Flos SpA) retenu."
    assert '"cost":125000' in quote_event["oldValue"] and '"cost":110000' in quote_event["newValue"]
    # Retaining the other quote replaces the retained line: one per item.
    again = client.post(f"/api/v1/quote-lines/{dixon['lines'][0]['id']}/retain").json()
    assert again["supplierId"] == world["dixon"].id and again["unitCostCents"] == 118_000
    assert (
        again["currency"] == "GBP" and again["fxRateMicro"] == GBP and again["leadTimeWeeks"] == 10
    )
    assert again["quotedOn"] == "2026-10-01" and again["quoteValidUntil"] == "2026-11-30"
    assert again["status"] == "quoted"
    comparison = client.get(f"/api/v1/project-items/{item_id}/quotes").json()
    assert [c["retained"] for c in comparison] == [True, False]
    assert client.get(f"/api/v1/quotes/{flos['id']}").json()["retainedCount"] == 0
    assert client.get(f"/api/v1/quotes/{dixon['id']}").json()["retainedCount"] == 1
    summary = client.get(f"/api/v1/projects/{world['project'].id}/summary").json()
    assert summary["specifiedCents"] == 117_351 * 12  # 14 082,12 € for the 12 keys


def test_retain_on_an_approved_line_also_writes_price_and_fx_events(
    client: TestClient, world: dict[str, Any]
) -> None:
    dixon, flos = two_quotes(client, world)
    item_id = world["item"]["id"]
    for status in ("specified", "quoted", "approved"):
        assert (
            client.post(
                f"/api/v1/project-items/{item_id}/status", json={"status": status}
            ).status_code
            == 200
        )
    client.post(f"/api/v1/quote-lines/{flos['lines'][0]['id']}/retain")
    kinds = [e["kind"] for e in client.get(f"/api/v1/project-items/{item_id}/events").json()]
    assert kinds[-3:] == ["quote", "price", "fx"]
    item = client.get(f"/api/v1/project-items/{item_id}").json()
    assert item["status"] == "approved" and item["approvedUnitNetCents"] == 124_313  # snapshot kept
    assert (
        client.patch(f"/api/v1/project-items/{item_id}", json={"orderRef": "PO-1"}).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/project-items/{item_id}/status", json={"status": "ordered"}
        ).status_code
        == 200
    )
    late = client.post(f"/api/v1/quote-lines/{dixon['lines'][0]['id']}/retain")
    assert late.status_code == 409 and "commandée" in late.json()["message"]


def test_retain_needs_the_line_preconditions_and_leaves_it_untouched_otherwise(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    free = client.post(
        f"/api/v1/projects/{p}/project-items",
        json={
            "name": "Rideau",
            "categoryId": world["item"]["categoryId"],
            "kind": "custom",
            "unitCostCents": 0,
            "placements": [{"zoneId": None, "qtyMilli": 1000}],
        },
    ).json()
    quote = post_quote(
        client,
        p,
        {
            "supplierId": world["flos"].id,
            "reference": "FL-9",
            "lines": [{"projectItemId": free["id"], "unitCostCents": 45_000}],
        },
    ).json()
    refused = client.post(f"/api/v1/quote-lines/{quote['lines'][0]['id']}/retain")
    assert refused.status_code == 422 and refused.json()["details"][0]["field"] == "placements"
    untouched = client.get(f"/api/v1/project-items/{free['id']}").json()
    assert (
        untouched["unitCostCents"] == 0
        and untouched["supplierId"] is None
        and untouched["status"] == "draft"
    )
    assert client.get(f"/api/v1/quotes/{quote['id']}").json()["retainedCount"] == 0


def test_declined_and_retained_quotes_are_protected(
    client: TestClient, world: dict[str, Any]
) -> None:
    dixon, flos = two_quotes(client, world)
    client.post(f"/api/v1/quote-lines/{flos['lines'][0]['id']}/retain")
    assert client.delete(f"/api/v1/quote-lines/{flos['lines'][0]['id']}").status_code == 409
    assert client.delete(f"/api/v1/quotes/{flos['id']}").status_code == 409
    declined = client.post(f"/api/v1/quotes/{dixon['id']}/decline").json()
    assert declined["declinedAt"] == "2026-10-09T12:00:00Z"
    assert client.post(f"/api/v1/quote-lines/{dixon['lines'][0]['id']}/retain").status_code == 409
    assert (
        client.get(f"/api/v1/project-items/{world['item']['id']}/quotes").json()[-1]["declined"]
        is True
    )
    assert client.delete(f"/api/v1/quotes/{dixon['id']}").status_code == 204
    assert client.get(f"/api/v1/quotes/{dixon['id']}").status_code == 404


def test_lines_update_delete_and_duplicate_item(client: TestClient, world: dict[str, Any]) -> None:
    dixon, _flos = two_quotes(client, world)
    line_id = dixon["lines"][0]["id"]
    duplicate = client.post(
        f"/api/v1/quotes/{dixon['id']}/lines",
        json={"projectItemId": world["item"]["id"], "unitCostCents": 1},
    )
    assert (
        duplicate.status_code == 422 and duplicate.json()["details"][0]["field"] == "projectItemId"
    )
    updated = client.patch(
        f"/api/v1/quote-lines/{line_id}",
        json={"unitCostCents": 120_000, "description": "Beat Fat, laiton"},
    ).json()
    assert (
        updated["lines"][0]["unitCostCents"] == 120_000
        and updated["lines"][0]["netUnitCents"] == 102_000
    )
    assert (
        client.patch(f"/api/v1/quote-lines/{line_id}", json={"unitCostCents": None}).status_code
        == 422
    )
    assert client.delete(f"/api/v1/quote-lines/{line_id}").json()["lines"] == []
    renamed = client.patch(
        f"/api/v1/quotes/{dixon['id']}",
        json={"reference": "TD-2026-119", "validUntil": "2026-12-31"},
    ).json()
    assert renamed["reference"] == "TD-2026-119" and renamed["validUntil"] == "2026-12-31"
    assert (
        client.patch(f"/api/v1/quotes/{dixon['id']}", json={"reference": "FL-1"}).status_code == 200
    )  # other supplier: free


def test_quote_files_attach_and_detach(client: TestClient, world: dict[str, Any]) -> None:
    dixon, _flos = two_quotes(client, world)
    uploaded = client.post(
        "/api/v1/files", files={"file": ("devis.png", PNG_BYTES, "image/png")}
    ).json()
    attached = client.post(
        f"/api/v1/quotes/{dixon['id']}/files",
        json={"fileId": uploaded["id"], "caption": "Devis signé"},
    )
    assert attached.status_code == 201 and attached.json()["files"][0]["caption"] == "Devis signé"
    assert (
        client.post(
            f"/api/v1/quotes/{dixon['id']}/files", json={"fileId": uploaded["id"]}
        ).status_code
        == 409
    )
    detached = client.delete(f"/api/v1/quotes/{dixon['id']}/files/{uploaded['id']}")
    assert detached.status_code == 200 and detached.json()["files"] == []
    assert client.get(f"/api/v1/files/{uploaded['id']}").status_code == 404  # orphan removed
