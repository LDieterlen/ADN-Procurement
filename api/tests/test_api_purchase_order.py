"""Bons de commande (ROADMAP étape 10b, ADR-0007) : BC sur 3 lignes, total = somme vérifiée au
centime, lignes verrouillées (`ordered`, `order_ref`), numérotation annuelle jamais décrémentée,
Engagé dans le budget, annulation d'un BC émis."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import PNG_BYTES, make_category, make_product, make_project, make_supplier, make_zone
from ffe.deps import Clock

GBP = 1_170_000


def approve(client: TestClient, item_id: int) -> None:
    for status in ("specified", "quoted", "approved"):
        response = client.post(f"/api/v1/project-items/{item_id}/status", json={"status": status})
        assert response.status_code == 200, response.text


@pytest.fixture
def world(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    """Hôtel X : LOB ×1, CHA ×12 ; Tom Dixon (GBP, 15 %) ; trois lignes validées chez Tom Dixon :
    LUM-001 lampe 1 250 GBP −15 % × 12 clés, LUM-002 applique 100 GBP × 2, LUM-003 50 GBP × 1."""
    project = make_project(
        session,
        clock,
        name="Hôtel X",
        delivery_address="12 rue du Chantier",
        delivery_contact="M. Dupont",
    )
    lob = make_zone(session, clock, project.id, code="LOB", name="Lobby", multiplier=1)
    cha = make_zone(session, clock, project.id, code="CHA", name="Chambre type A", multiplier=12)
    lum = make_category(session, clock, name="Luminaires", code="LUM")
    dixon = make_supplier(
        session,
        clock,
        name="Tom Dixon",
        currency="GBP",
        default_discount_bp=1500,
        payment_terms="30 jours",
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
    base = f"/api/v1/projects/{project.id}/project-items"
    lamp_item = client.post(
        base,
        json={
            "productId": lamp.id,
            "fxRateMicro": GBP,
            "placements": [{"zoneId": cha.id, "qtyMilli": 1000}],
        },
    ).json()
    applique = client.post(
        base,
        json={
            "name": "Applique",
            "categoryId": lum.id,
            "kind": "custom",
            "supplierId": dixon.id,
            "unitCostCents": 10_000,
            "discountBp": 0,
            "currency": "GBP",
            "fxRateMicro": GBP,
            "placements": [{"zoneId": lob.id, "qtyMilli": 2000}],
        },
    ).json()
    small = client.post(
        base,
        json={
            "name": "Ampoule",
            "categoryId": lum.id,
            "kind": "custom",
            "supplierId": dixon.id,
            "unitCostCents": 5_000,
            "discountBp": 0,
            "currency": "GBP",
            "fxRateMicro": GBP,
            "placements": [{"zoneId": lob.id, "qtyMilli": 1000}],
        },
    ).json()
    for item in (lamp_item, applique, small):
        approve(client, item["id"])
    return {
        "project": project,
        "lob": lob,
        "cha": cha,
        "lum": lum,
        "dixon": dixon,
        "flos": flos,
        "items": [lamp_item, applique, small],
    }


def post_po(client: TestClient, project_id: int, body: dict[str, Any]) -> Any:
    return client.post(f"/api/v1/projects/{project_id}/purchase-orders", json=body)


def test_create_po_on_three_lines_totals_add_up_to_the_cent(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    ids = [i["id"] for i in world["items"]]
    created = post_po(
        client,
        p,
        {"supplierId": world["dixon"].id, "itemIds": ids, "expectedDeliveryOn": "2027-01-15"},
    )
    assert created.status_code == 201, created.text
    po = created.json()
    assert po["number"] == "PO-2026-001" and po["status"] == "draft"
    assert (
        po["currency"] == "GBP" and po["fxRateMicro"] == GBP and po["supplierName"] == "Tom Dixon"
    )
    assert po["deliveryAddress"] == "12 rue du Chantier" and po["deliveryContact"] == "M. Dupont"
    assert po["paymentTerms"] == "30 jours"
    lines = {line["itemCode"]: line for line in po["lines"]}
    assert lines["LUM-001"]["qtyMilli"] == 12_000 and lines["LUM-001"]["netUnitCents"] == 106_250
    assert (
        lines["LUM-001"]["totalCents"] == 1_275_000
        and lines["LUM-001"]["totalEurCents"] == 1_491_756
    )
    assert lines["LUM-002"]["totalCents"] == 20_000 and lines["LUM-002"]["totalEurCents"] == 23_400
    assert lines["LUM-003"]["totalCents"] == 5_000 and lines["LUM-003"]["totalEurCents"] == 5_850
    assert po["totalCents"] == 1_275_000 + 20_000 + 5_000 == 1_300_000
    assert po["totalEurCents"] == 1_491_756 + 23_400 + 5_850 == 1_521_006
    assert po["vatByRateBp"] == {"2000": 304_201} and po["vatCents"] == 304_201
    assert po["ttcEurCents"] == 1_521_006 + 304_201
    assert [x["number"] for x in client.get(f"/api/v1/projects/{p}/purchase-orders").json()] == [
        "PO-2026-001"
    ]


def test_numbering_is_annual_and_never_decremented(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    first = post_po(client, p, {"supplierId": world["dixon"].id}).json()
    second = post_po(client, p, {"supplierId": world["flos"].id}).json()
    assert (first["number"], second["number"]) == ("PO-2026-001", "PO-2026-002")
    assert client.delete(f"/api/v1/purchase-orders/{second['id']}").status_code == 204
    third = post_po(client, p, {"supplierId": world["flos"].id}).json()
    assert third["number"] == "PO-2026-003" and third["currency"] == "EUR"


def test_issue_locks_the_lines_and_feeds_the_budget(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    ids = [i["id"] for i in world["items"]]
    po = post_po(
        client,
        p,
        {"supplierId": world["dixon"].id, "itemIds": ids, "expectedDeliveryOn": "2027-01-15"},
    ).json()
    issued = client.post(f"/api/v1/purchase-orders/{po['id']}/issue")
    assert issued.status_code == 200, issued.text
    assert issued.json()["status"] == "issued" and issued.json()["issuedOn"] == "2026-10-09"
    for item_id in ids:
        item = client.get(f"/api/v1/project-items/{item_id}").json()
        assert item["status"] == "ordered" and item["orderRef"] == "PO-2026-001"
        assert item["expectedDeliveryOn"] == "2027-01-15"
        events = client.get(f"/api/v1/project-items/{item_id}/events").json()
        assert events[-1]["kind"] == "status" and events[-1]["toStatus"] == "ordered"
        assert events[-1]["note"] == "PO-2026-001"
        back = client.post(f"/api/v1/project-items/{item_id}/status", json={"status": "approved"})
        assert back.status_code == 409  # locked: no return after ordered
    assert client.post(f"/api/v1/purchase-orders/{po['id']}/issue").status_code == 409
    line_id = issued.json()["lines"][0]["id"]
    assert (
        client.patch(f"/api/v1/purchase-order-lines/{line_id}", json={"qtyMilli": 1000}).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/purchase-orders/{po['id']}/lines", json={"itemIds": [ids[0]]}
        ).status_code
        == 409
    )
    budget = client.get(f"/api/v1/projects/{p}/summary").json()["budget"]
    assert budget["engagedCents"] == 1_521_006
    by_zone = {r["label"]: r for r in budget["byZone"]}
    assert by_zone["Chambre type A"]["engagedCents"] == 1_491_756
    assert by_zone["Lobby"]["engagedCents"] == 23_400 + 5_850
    assert {r["label"]: r["engagedCents"] for r in budget["byCategory"]} == {
        "LUM — Luminaires": 1_521_006
    }
    again = post_po(client, p, {"supplierId": world["dixon"].id, "itemIds": [ids[0]]})
    assert again.status_code == 409 and "PO-2026-001" in again.json()["message"]


def test_po_validation_field_by_field(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    ids = [i["id"] for i in world["items"]]
    wrong_supplier = post_po(client, p, {"supplierId": world["flos"].id, "itemIds": [ids[0]]})
    assert (
        wrong_supplier.status_code == 422
        and wrong_supplier.json()["details"][0]["field"] == "itemIds.0"
    )
    assert "pas chez ce fournisseur" in wrong_supplier.json()["details"][0]["message"]
    draft_line = client.post(
        f"/api/v1/projects/{p}/project-items",
        json={
            "name": "Brouillon",
            "categoryId": world["lum"].id,
            "kind": "custom",
            "supplierId": world["dixon"].id,
            "unitCostCents": 100,
            "currency": "GBP",
            "fxRateMicro": GBP,
        },
    ).json()
    not_approved = post_po(
        client, p, {"supplierId": world["dixon"].id, "itemIds": [draft_line["id"]]}
    )
    assert (
        not_approved.status_code == 422
        and "validée" in not_approved.json()["details"][0]["message"]
    )
    empty = post_po(client, p, {"supplierId": world["dixon"].id}).json()
    no_lines = client.post(f"/api/v1/purchase-orders/{empty['id']}/issue")
    assert no_lines.status_code == 422 and no_lines.json()["details"][0]["field"] == "lines"
    assert (
        client.post(
            f"/api/v1/purchase-orders/{empty['id']}/status", json={"status": "acknowledged"}
        ).status_code
        == 409
    )
    unknown = post_po(client, p, {"supplierId": 999})
    assert unknown.status_code == 422 and unknown.json()["details"][0]["field"] == "supplierId"
    client.post(f"/api/v1/projects/{p}/status", json={"status": "closed"})
    assert post_po(client, p, {"supplierId": world["dixon"].id}).status_code == 409


def test_draft_lines_can_be_adjusted_then_cancelling_an_issued_po_cancels_the_lines(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    ids = [i["id"] for i in world["items"]]
    po = post_po(client, p, {"supplierId": world["dixon"].id, "itemIds": ids[:1]}).json()
    po = client.post(f"/api/v1/purchase-orders/{po['id']}/lines", json={"itemIds": ids[1:]}).json()
    assert len(po["lines"]) == 3
    line = po["lines"][1]
    adjusted = client.patch(
        f"/api/v1/purchase-order-lines/{line['id']}",
        json={"qtyMilli": 3000, "description": "Applique laiton"},
    ).json()
    assert adjusted["totalCents"] == 1_275_000 + 30_000 + 5_000
    removed = client.delete(f"/api/v1/purchase-order-lines/{po['lines'][2]['id']}").json()
    assert len(removed["lines"]) == 2
    client.post(f"/api/v1/purchase-orders/{po['id']}/issue")
    no_note = client.post(
        f"/api/v1/purchase-orders/{po['id']}/status", json={"status": "cancelled"}
    )
    assert no_note.status_code == 422 and no_note.json()["details"][0]["field"] == "note"
    cancelled = client.post(
        f"/api/v1/purchase-orders/{po['id']}/status",
        json={"status": "cancelled", "note": "fournisseur défaillant"},
    )
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"
    for item_id in ids[:2]:
        item = client.get(f"/api/v1/project-items/{item_id}").json()
        assert item["status"] == "cancelled" and item["orderRef"] == "PO-2026-001"
        assert (
            client.get(f"/api/v1/project-items/{item_id}/events").json()[-1]["note"]
            == "BC PO-2026-001 annulé : fournisseur défaillant"
        )
    assert (
        client.get(f"/api/v1/project-items/{ids[2]}").json()["status"] == "approved"
    )  # removed before issue
    assert client.get(f"/api/v1/projects/{p}/summary").json()["budget"]["engagedCents"] == 0
    assert (
        client.patch(f"/api/v1/purchase-orders/{po['id']}", json={"notes": "x"}).status_code == 409
    )


def test_acknowledge_then_close_and_files(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    po = post_po(
        client, p, {"supplierId": world["dixon"].id, "itemIds": [world["items"][0]["id"]]}
    ).json()
    client.post(f"/api/v1/purchase-orders/{po['id']}/issue")
    ack = client.post(
        f"/api/v1/purchase-orders/{po['id']}/status", json={"status": "acknowledged"}
    ).json()
    assert ack["status"] == "acknowledged"
    with_ref = client.patch(
        f"/api/v1/purchase-orders/{po['id']}", json={"supplierRef": "AR-77"}
    ).json()
    assert with_ref["supplierRef"] == "AR-77"
    uploaded = client.post(
        "/api/v1/files", files={"file": ("bc.png", PNG_BYTES, "image/png")}
    ).json()
    attached = client.post(
        f"/api/v1/purchase-orders/{po['id']}/files",
        json={"fileId": uploaded["id"], "caption": "BC signé"},
    )
    assert attached.status_code == 201 and attached.json()["files"][0]["caption"] == "BC signé"
    assert (
        client.post(
            f"/api/v1/purchase-orders/{po['id']}/files", json={"fileId": uploaded["id"]}
        ).status_code
        == 409
    )
    closed = client.post(
        f"/api/v1/purchase-orders/{po['id']}/status", json={"status": "closed"}
    ).json()
    assert closed["status"] == "closed"
    assert (
        client.get(f"/api/v1/projects/{p}/summary").json()["budget"]["engagedCents"] == 1_491_756
    )  # still engaged
    assert (
        client.delete(f"/api/v1/purchase-orders/{po['id']}/files/{uploaded['id']}").status_code
        == 409
    )  # closed
