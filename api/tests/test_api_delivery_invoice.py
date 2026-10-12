"""Réceptions et factures (ROADMAP étape 10c, ADR-0008) : réception partielle puis totale, factures
d'acompte et de solde, budget cohérent (Engagé / Facturé / Payé), corrections."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_category, make_product, make_project, make_supplier, make_zone
from ffe.deps import Clock

GBP = 1_170_000


@pytest.fixture
def po(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    """Un BC émis chez Tom Dixon : LUM-001 lampe × 12 (1 062,50 GBP net) et LUM-002 applique × 2 (100 GBP)."""
    project = make_project(session, clock, name="Hôtel X")
    lob = make_zone(session, clock, project.id, code="LOB", name="Lobby", multiplier=1)
    cha = make_zone(session, clock, project.id, code="CHA", name="Chambre type A", multiplier=12)
    lum = make_category(session, clock, name="Luminaires", code="LUM")
    dixon = make_supplier(
        session, clock, name="Tom Dixon", currency="GBP", default_discount_bp=1500
    )
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
    items = [
        client.post(
            base,
            json={
                "productId": lamp.id,
                "fxRateMicro": GBP,
                "placements": [{"zoneId": cha.id, "qtyMilli": 1000}],
            },
        ).json(),
        client.post(
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
        ).json(),
    ]
    for item in items:
        for status in ("specified", "quoted", "approved"):
            assert (
                client.post(
                    f"/api/v1/project-items/{item['id']}/status", json={"status": status}
                ).status_code
                == 200
            )
    created = client.post(
        f"/api/v1/projects/{project.id}/purchase-orders",
        json={"supplierId": dixon.id, "itemIds": [i["id"] for i in items]},
    ).json()
    issued = client.post(f"/api/v1/purchase-orders/{created['id']}/issue").json()
    return {
        "project": project,
        "po": issued,
        "items": items,
        "lines": {line["itemCode"]: line for line in issued["lines"]},
    }


def receive(
    client: TestClient,
    po_id: int,
    lines: list[dict[str, Any]],
    on: str = "2026-11-02",
    ref: str | None = "BL-1",
) -> Any:
    return client.post(
        f"/api/v1/purchase-orders/{po_id}/deliveries",
        json={"receivedOn": on, "reference": ref, "lines": lines},
    )


def test_partial_then_complete_receipt(client: TestClient, po: dict[str, Any]) -> None:
    po_id, lines, items = po["po"]["id"], po["lines"], po["items"]
    partial = receive(
        client,
        po_id,
        [
            {
                "purchaseOrderLineId": lines["CHA-LUM-01"]["id"],
                "qtyMilli": 6000,
                "remarks": "2 cartons abîmés",
            }
        ],
    )
    assert partial.status_code == 201, partial.text
    assert (
        partial.json()["lines"][0]["itemCode"] == "CHA-LUM-01"
        and partial.json()["lines"][0]["qtyMilli"] == 6000
    )
    after = client.get(f"/api/v1/purchase-orders/{po_id}").json()
    assert after["status"] == "partially_delivered" and after["deliveriesCount"] == 1
    assert {l["itemCode"]: l["receivedQtyMilli"] for l in after["lines"]} == {
        "CHA-LUM-01": 6000,
        "LOB-LUM-01": 0,
    }
    assert client.get(f"/api/v1/project-items/{items[0]['id']}").json()["status"] == "ordered"
    too_much = receive(
        client,
        po_id,
        [{"purchaseOrderLineId": lines["CHA-LUM-01"]["id"], "qtyMilli": 7000}],
        ref="BL-2",
    )
    assert (
        too_much.status_code == 422 and too_much.json()["details"][0]["field"] == "lines.0.qtyMilli"
    )
    complete = receive(
        client,
        po_id,
        [
            {"purchaseOrderLineId": lines["CHA-LUM-01"]["id"], "qtyMilli": 6000},
            {"purchaseOrderLineId": lines["LOB-LUM-01"]["id"], "qtyMilli": 2000},
        ],
        on="2026-11-20",
        ref="BL-2",
    )
    assert complete.status_code == 201, complete.text
    final = client.get(f"/api/v1/purchase-orders/{po_id}").json()
    assert final["status"] == "closed" and final["deliveriesCount"] == 2
    for item in items:
        read = client.get(f"/api/v1/project-items/{item['id']}").json()
        assert read["status"] == "delivered"
        last = client.get(f"/api/v1/project-items/{item['id']}/events").json()[-1]
        assert last["toStatus"] == "delivered" and last["note"] == "Réception BL-2 du 2026-11-20."
    assert (
        client.post(
            f"/api/v1/project-items/{items[0]['id']}/status", json={"status": "installed"}
        ).status_code
        == 200
    )
    deliveries = client.get(f"/api/v1/purchase-orders/{po_id}/deliveries").json()
    assert [d["reference"] for d in deliveries] == ["BL-1", "BL-2"]
    # Correction: the second receipt cannot go (LUM-001 is installed), the first alone could not either.
    assert client.delete(f"/api/v1/deliveries/{deliveries[1]['id']}").status_code == 409


def test_deleting_a_receipt_reopens_the_lines(client: TestClient, po: dict[str, Any]) -> None:
    po_id, lines, items = po["po"]["id"], po["lines"], po["items"]
    delivery = receive(
        client,
        po_id,
        [
            {"purchaseOrderLineId": lines["CHA-LUM-01"]["id"], "qtyMilli": 12_000},
            {"purchaseOrderLineId": lines["LOB-LUM-01"]["id"], "qtyMilli": 2000},
        ],
    ).json()
    assert client.get(f"/api/v1/purchase-orders/{po_id}").json()["status"] == "closed"
    reverted = client.delete(f"/api/v1/deliveries/{delivery['id']}")
    assert reverted.status_code == 200 and reverted.json()["status"] == "acknowledged"
    assert reverted.json()["deliveriesCount"] == 0
    for item in items:
        read = client.get(f"/api/v1/project-items/{item['id']}").json()
        assert read["status"] == "ordered"
        assert (
            "supprimée"
            in client.get(f"/api/v1/project-items/{item['id']}/events").json()[-1]["note"]
        )


def test_receipt_validation(client: TestClient, po: dict[str, Any]) -> None:
    po_id, lines = po["po"]["id"], po["lines"]
    assert receive(client, po_id, []).status_code == 422
    foreign = receive(client, po_id, [{"purchaseOrderLineId": 999, "qtyMilli": 1}])
    assert (
        foreign.status_code == 422
        and foreign.json()["details"][0]["field"] == "lines.0.purchaseOrderLineId"
    )
    twice = receive(
        client,
        po_id,
        [
            {"purchaseOrderLineId": lines["LOB-LUM-01"]["id"], "qtyMilli": 1000},
            {"purchaseOrderLineId": lines["LOB-LUM-01"]["id"], "qtyMilli": 1000},
        ],
    )
    assert twice.status_code == 422 and "même ligne" in twice.json()["details"][0]["message"]
    draft = client.post(
        f"/api/v1/projects/{po['project'].id}/purchase-orders",
        json={"supplierId": po["po"]["supplierId"]},
    ).json()
    assert (
        receive(client, draft["id"], [{"purchaseOrderLineId": 1, "qtyMilli": 1}]).status_code == 409
    )


def test_deposit_and_balance_invoices_feed_invoiced_and_paid(
    client: TestClient, po: dict[str, Any]
) -> None:
    p, po_id = po["project"].id, po["po"]["id"]
    # Order total 12 750 + 200 = 12 950,00 GBP ; deposit 30 % = 3 885,00 GBP ; balance 9 065,00 GBP.
    deposit = client.post(
        f"/api/v1/purchase-orders/{po_id}/invoices",
        json={
            "kind": "deposit",
            "reference": "F-2026-0101",
            "invoicedOn": "2026-10-15",
            "dueOn": "2026-11-14",
            "amountHtCents": 388_500,
            "vatCents": 0,
        },
    )
    assert deposit.status_code == 201, deposit.text
    assert (
        deposit.json()["ttcCents"] == 388_500 and deposit.json()["amountHtEurCents"] == 454_545
    )  # 3 885 × 1,17
    balance = client.post(
        f"/api/v1/purchase-orders/{po_id}/invoices",
        json={
            "kind": "balance",
            "reference": "F-2026-0188",
            "invoicedOn": "2026-11-20",
            "amountHtCents": 906_500,
            "vatCents": 181_300,
        },
    ).json()
    assert balance["ttcCents"] == 1_087_800
    duplicate = client.post(
        f"/api/v1/purchase-orders/{po_id}/invoices",
        json={"reference": "F-2026-0188", "invoicedOn": "2026-11-20", "amountHtCents": 1},
    )
    assert duplicate.status_code == 422 and duplicate.json()["details"][0]["field"] == "reference"
    budget = client.get(f"/api/v1/projects/{p}/summary").json()["budget"]
    assert budget["engagedCents"] == 1_491_756 + 23_400 == 1_515_156
    assert budget["invoicedCents"] == 454_545 + 1_060_605 == 1_515_150  # 9 065 × 1,17 = 10 606,05
    assert budget["paidCents"] == 0
    paid = client.post(
        f"/api/v1/invoices/{deposit.json()['id']}/pay",
        json={"paidOn": "2026-10-20", "paymentRef": "VIR-77"},
    )
    assert paid.status_code == 200 and paid.json()["paidOn"] == "2026-10-20"
    budget = client.get(f"/api/v1/projects/{p}/summary").json()["budget"]
    assert budget["paidCents"] == 454_545
    read = client.get(f"/api/v1/purchase-orders/{po_id}").json()
    assert read["invoicedHtCents"] == 388_500 + 906_500 and read["paidHtCents"] == 388_500
    assert [i["kind"] for i in client.get(f"/api/v1/purchase-orders/{po_id}/invoices").json()] == [
        "deposit",
        "balance",
    ]
    # Paid = frozen; unpaid = editable and deletable.
    assert (
        client.patch(
            f"/api/v1/invoices/{deposit.json()['id']}", json={"amountHtCents": 1}
        ).status_code
        == 409
    )
    assert client.delete(f"/api/v1/invoices/{deposit.json()['id']}").status_code == 409
    assert (
        client.patch(f"/api/v1/invoices/{deposit.json()['id']}", json={"notes": "ok"}).status_code
        == 200
    )
    assert (
        client.patch(f"/api/v1/invoices/{balance['id']}", json={"dueOn": "2026-12-20"}).json()[
            "dueOn"
        ]
        == "2026-12-20"
    )
    assert client.delete(f"/api/v1/invoices/{balance['id']}").status_code == 204
    assert client.get(f"/api/v1/projects/{p}/summary").json()["budget"]["invoicedCents"] == 454_545


def test_cancelled_order_refuses_invoices(client: TestClient, po: dict[str, Any]) -> None:
    po_id = po["po"]["id"]
    client.post(
        f"/api/v1/purchase-orders/{po_id}/status", json={"status": "cancelled", "note": "annulé"}
    )
    refused = client.post(
        f"/api/v1/purchase-orders/{po_id}/invoices",
        json={"reference": "F-1", "invoicedOn": "2026-10-15", "amountHtCents": 1},
    )
    assert refused.status_code == 409
