"""Lines: creation from product or free, defaults precedence, codes, placements, status machine,
snapshot, journal, replacement, deletion, summary (ROADMAP 7a critère de fini, DATA_MODEL §10)."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_category, make_item, make_product, make_project, make_supplier, make_zone
from ffe.deps import Clock

GBP = 1_170_000


@pytest.fixture
def world(session: Session, clock: Clock) -> dict[str, Any]:
    """Hôtel X : LOB ×1, CHA ×12, CHB ×8 ; LUM ; Tom Dixon (GBP, 15 %) ; Beat Light Fat 1 250,00 GBP HT."""
    project = make_project(session, clock, name="Hôtel X")
    lob = make_zone(session, clock, project.id, code="LOB", name="Lobby", multiplier=1)
    cha = make_zone(session, clock, project.id, code="CHA", name="Chambre type A", multiplier=12)
    chb = make_zone(session, clock, project.id, code="CHB", name="Chambre type B", multiplier=8)
    lum = make_category(session, clock, name="Luminaires", code="LUM")
    applique = make_category(session, clock, name="Applique", code=None, parent_id=lum.id)
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
        lead_time_weeks=8,
        finish="laiton",
    )
    return {
        "project": project,
        "lob": lob,
        "cha": cha,
        "chb": chb,
        "lum": lum,
        "applique": applique,
        "dixon": dixon,
        "lamp": lamp,
    }


def post_item(client: TestClient, project_id: int, body: dict[str, Any]) -> Any:
    return client.post(f"/api/v1/projects/{project_id}/project-items", json=body)


def set_status(client: TestClient, item_id: int, status: str, note: str | None = None) -> Any:
    return client.post(
        f"/api/v1/project-items/{item_id}/status", json={"status": status, "note": note}
    )


# --- création et précédence des défauts --------------------------------------------------------


def test_create_from_product_copies_everything_and_needs_the_fx_rate(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    missing_fx = post_item(client, p, {"productId": world["lamp"].id})
    assert (
        missing_fx.status_code == 422 and missing_fx.json()["details"][0]["field"] == "fxRateMicro"
    )
    response = post_item(
        client,
        p,
        {
            "productId": world["lamp"].id,
            "fxRateMicro": GBP,
            "placements": [
                {"zoneId": world["lob"].id, "qtyMilli": 2000},
                {"zoneId": world["cha"].id, "qtyMilli": 1000},
            ],
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert (
        body["itemCode"] == "LUM-001"
        and body["name"] == "Beat Light Fat"
        and body["finish"] == "laiton"
    )
    assert (
        body["supplierId"] == world["dixon"].id
        and body["currency"] == "GBP"
        and body["discountBp"] == 1500
    )
    assert (
        body["unitCostCents"] == 125_000
        and body["vatRateBp"] == 2000
        and body["leadTimeWeeks"] == 8
    )
    assert body["status"] == "draft" and body["onHold"] is False and len(body["placements"]) == 2
    events = client.get(f"/api/v1/project-items/{body['id']}/events").json()
    assert [e["kind"] for e in events] == ["created"]
    # the next GBP line reuses the last rate of the project
    second = post_item(client, p, {"productId": world["lamp"].id}).json()
    assert second["fxRateMicro"] == GBP and second["itemCode"] == "LUM-002"


def test_create_free_line_needs_category_and_name_and_gets_one_unassigned_placement(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    assert post_item(client, p, {"name": "Rideau"}).json()["details"][0]["field"] == "categoryId"
    assert (
        post_item(client, p, {"categoryId": world["lum"].id}).json()["details"][0]["field"]
        == "name"
    )
    body = post_item(
        client,
        p,
        {
            "categoryId": world["applique"].id,
            "name": "Applique sur mesure",
            "kind": "custom",
            "unitCostCents": 45_000,
        },
    ).json()
    assert body["itemCode"] == "LUM-001"  # level-1 prefix of the child category
    assert (
        body["currency"] == "EUR" and body["fxRateMicro"] == 1_000_000 and body["discountBp"] == 0
    )
    assert body["placements"] == [{**body["placements"][0], "zoneId": None, "qtyMilli": 1000}]


def test_ttc_catalogue_price_is_brought_back_to_ht(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    ttc = make_product(
        session,
        clock,
        name="Lampe TTC",
        category_id=world["lum"].id,
        list_price_cents=12_000,
        list_price_tax_mode="ttc",
        list_price_vat_bp=2000,
    )
    body = post_item(client, world["project"].id, {"productId": ttc.id}).json()
    assert body["unitCostCents"] == 10_000 and body["currency"] == "EUR"


def test_existing_lines_are_free_and_eur_rate_is_parity(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    refused = post_item(
        client,
        p,
        {
            "categoryId": world["lum"].id,
            "name": "Lustre existant",
            "kind": "existing",
            "unitCostCents": 100,
        },
    )
    assert refused.status_code == 422 and refused.json()["details"][0]["field"] == "unitCostCents"
    bad_fx = post_item(
        client,
        p,
        {"categoryId": world["lum"].id, "name": "X", "currency": "EUR", "fxRateMicro": 999},
    )
    assert bad_fx.status_code == 422 and bad_fx.json()["details"][0]["field"] == "fxRateMicro"


def test_item_code_can_be_chosen_and_sequence_never_goes_back(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    first = post_item(client, p, {"categoryId": world["lum"].id, "name": "A"}).json()
    assert first["itemCode"] == "LUM-001"
    client.delete(f"/api/v1/project-items/{first['id']}")
    second = post_item(client, p, {"categoryId": world["lum"].id, "name": "B"}).json()
    assert second["itemCode"] == "LUM-002"  # the hole is kept
    custom = post_item(
        client, p, {"categoryId": world["lum"].id, "name": "C", "itemCode": "LUM-099"}
    ).json()
    assert custom["itemCode"] == "LUM-099"
    dup = post_item(client, p, {"categoryId": world["lum"].id, "name": "D", "itemCode": "LUM-099"})
    assert dup.status_code == 422 and dup.json()["details"][0]["field"] == "itemCode"
    renamed = client.patch(f"/api/v1/project-items/{second['id']}", json={"itemCode": "LUM-010"})
    assert renamed.json()["itemCode"] == "LUM-010"


# --- placements et quantités ------------------------------------------------------------------


def test_same_lamp_in_two_zones_is_one_code_and_14_pieces(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    item = post_item(
        client,
        p,
        {
            "productId": world["lamp"].id,
            "fxRateMicro": GBP,
            "placements": [
                {"zoneId": world["lob"].id, "qtyMilli": 2000},
                {"zoneId": world["cha"].id, "qtyMilli": 1000},
            ],
        },
    ).json()
    summary = client.get(f"/api/v1/projects/{p}/summary").json()
    line = summary["lines"][0]
    assert line["itemCode"] == "LUM-001" and line["totalQtyMilli"] == 14_000
    assert (
        line["netUnitCents"] == 106_250
        and line["netUnitEurCents"] == 124_313
        and line["totalHtCents"] == 1_740_382
    )
    assert (
        summary["specifiedCents"] == 1_740_382
        and summary["vatCents"] == 348_076
        and summary["ttcCents"] == 2_088_458
    )
    zones = {z["zoneCode"]: z["specifiedCents"] for z in summary["zones"]}
    assert zones["LOB"] == 248_626 and zones["CHA"] == 1_491_756
    assert (
        client.get(
            f"/api/v1/projects/{p}/project-items", params={"zoneId": world["cha"].id}
        ).json()[0]["id"]
        == item["id"]
    )
    assert (
        client.get(f"/api/v1/projects/{p}/project-items", params={"zoneId": world["chb"].id}).json()
        == []
    )


def test_placement_rules(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    item = post_item(client, p, {"productId": world["lamp"].id, "fxRateMicro": GBP}).json()
    url = f"/api/v1/project-items/{item['id']}/placements"
    fractional = client.post(url, json={"zoneId": world["cha"].id, "qtyMilli": 1500})
    assert fractional.status_code == 422 and fractional.json()["details"][0]["field"] == "qtyMilli"
    other_project = client.post(url, json={"zoneId": 9999, "qtyMilli": 1000})
    assert (
        other_project.status_code == 422 and other_project.json()["details"][0]["field"] == "zoneId"
    )
    added = client.post(url, json={"zoneId": world["cha"].id, "qtyMilli": 1000}).json()
    assert [pl["zoneId"] for pl in added["placements"]] == [None, world["cha"].id]
    assert (
        client.post(url, json={"zoneId": world["cha"].id, "qtyMilli": 2000}).status_code == 422
    )  # already placed there
    unassigned_id = added["placements"][0]["id"]
    moved = client.patch(
        f"/api/v1/placements/{unassigned_id}", json={"zoneId": world["lob"].id, "qtyMilli": 2000}
    ).json()
    assert sorted(pl["zoneId"] for pl in moved["placements"]) == sorted(
        [world["lob"].id, world["cha"].id]
    )
    removed = client.delete(f"/api/v1/placements/{unassigned_id}").json()
    assert len(removed["placements"]) == 1
    last = client.delete(f"/api/v1/placements/{removed['placements'][0]['id']}")
    assert last.status_code == 409


def test_carpet_in_m2_allows_fractional_quantities(
    client: TestClient, world: dict[str, Any]
) -> None:
    txt = make_category_via(client, "TXT", "Textiles")
    body = post_item(
        client,
        world["project"].id,
        {
            "categoryId": txt,
            "name": "Moquette",
            "unit": "m2",
            "unitCostCents": 4500,
            "placements": [{"zoneId": world["cha"].id, "qtyMilli": 12_500}],
        },
    ).json()
    line = client.get(f"/api/v1/projects/{world['project'].id}/summary").json()["lines"][0]
    assert (
        body["itemCode"] == "TXT-001"
        and line["totalQtyMilli"] == 150_000
        and line["totalHtCents"] == 675_000
    )


def make_category_via(client: TestClient, code: str, name: str) -> int:
    return client.post("/api/v1/categories", json={"code": code, "name": name}).json()["id"]


# --- statuts, snapshot, journal ---------------------------------------------------------------


def approved_lamp(client: TestClient, world: dict[str, Any]) -> dict[str, Any]:
    item = post_item(
        client,
        world["project"].id,
        {
            "productId": world["lamp"].id,
            "fxRateMicro": GBP,
            "placements": [
                {"zoneId": world["lob"].id, "qtyMilli": 2000},
                {"zoneId": world["cha"].id, "qtyMilli": 1000},
            ],
        },
    ).json()
    assert set_status(client, item["id"], "specified").status_code == 200
    assert set_status(client, item["id"], "quoted").status_code == 200
    approved = set_status(client, item["id"], "approved")
    assert approved.status_code == 200, approved.text
    return approved.json()


def test_approval_sets_the_snapshot_and_revision_keeps_it(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = approved_lamp(client, world)
    assert item["approvedAt"] == "2026-10-09T12:00:00Z"
    assert item["approvedUnitNetCents"] == 124_313 and item["approvedTotalQtyMilli"] == 14_000
    revised = client.patch(
        f"/api/v1/project-items/{item['id']}", json={"unitCostCents": 130_000}
    ).json()
    assert revised["approvedUnitNetCents"] == 124_313  # the client saw 17 403,82 €
    summary = client.get(f"/api/v1/projects/{world['project'].id}/summary").json()
    assert summary["specifiedCents"] == 1_809_990 and summary["approvedCents"] == 1_740_382
    kinds = [e["kind"] for e in client.get(f"/api/v1/project-items/{item['id']}/events").json()]
    assert kinds == ["created", "status", "status", "status", "approval", "price"]


def test_journal_only_starts_at_approval(client: TestClient, world: dict[str, Any]) -> None:
    item = post_item(
        client, world["project"].id, {"productId": world["lamp"].id, "fxRateMicro": GBP}
    ).json()
    client.patch(
        f"/api/v1/project-items/{item['id']}",
        json={"unitCostCents": 118_000, "fxRateMicro": 1_200_000},
    )
    kinds = [e["kind"] for e in client.get(f"/api/v1/project-items/{item['id']}/events").json()]
    assert kinds == ["created"]  # a corrected draft stays deletable
    assert client.delete(f"/api/v1/project-items/{item['id']}").status_code == 204


def test_preconditions_by_target_status(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    item = post_item(client, p, {"categoryId": world["lum"].id, "name": "Sans zone"}).json()
    blocked = set_status(client, item["id"], "specified")
    assert blocked.status_code == 422
    assert {d["field"] for d in blocked.json()["details"]} == {"productId", "placements"}
    custom = post_item(
        client,
        p,
        {
            "categoryId": world["lum"].id,
            "name": "Sur mesure",
            "kind": "custom",
            "placements": [{"zoneId": world["lob"].id, "qtyMilli": 1000}],
        },
    ).json()
    assert set_status(client, custom["id"], "specified").status_code == 200
    quoted = set_status(client, custom["id"], "quoted")
    assert quoted.status_code == 422 and {d["field"] for d in quoted.json()["details"]} == {
        "supplierId",
        "unitCostCents",
    }
    fee = post_item(
        client,
        p,
        {
            "categoryId": world["lum"].id,
            "name": "Transport",
            "fxRateMicro": GBP,
            "kind": "fee",
            "supplierId": world["dixon"].id,
            "unitCostCents": 45_000,
        },
    ).json()
    assert set_status(client, fee["id"], "quoted").status_code == 200  # no zone needed for fees


def test_ordered_needs_order_ref_and_never_goes_back(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = approved_lamp(client, world)
    no_ref = set_status(client, item["id"], "ordered")
    assert no_ref.status_code == 422 and no_ref.json()["details"][0]["field"] == "orderRef"
    client.patch(f"/api/v1/project-items/{item['id']}", json={"orderRef": "PO-2026-12"})
    assert set_status(client, item["id"], "ordered").status_code == 200
    back = set_status(client, item["id"], "draft")
    assert back.status_code == 409 and "retour" in back.json()["message"]
    assert set_status(client, item["id"], "delivered").status_code == 200
    assert set_status(client, item["id"], "installed").status_code == 200
    cancelled = set_status(client, item["id"], "cancelled", note="dégât à la livraison")
    assert cancelled.status_code == 200
    reopen = set_status(client, item["id"], "draft", note="finalement")
    assert reopen.status_code == 409 and "ne se rouvre pas" in reopen.json()["message"]


def test_cancel_requires_a_note_and_frees_the_budget(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = approved_lamp(client, world)
    assert set_status(client, item["id"], "cancelled").status_code == 422
    assert set_status(client, item["id"], "cancelled", note="client renonce").status_code == 200
    summary = client.get(f"/api/v1/projects/{world['project'].id}/summary").json()
    assert summary["specifiedCents"] == 0 and summary["approvedCents"] == 0
    assert summary["lines"][0]["counted"] is False
    assert (
        client.patch(f"/api/v1/project-items/{item['id']}", json={"name": "x"}).status_code == 409
    )
    reopened = set_status(client, item["id"], "draft", note="reprise")
    assert reopened.status_code == 200  # never ordered: allowed


def test_back_from_approved_needs_a_note(client: TestClient, world: dict[str, Any]) -> None:
    item = approved_lamp(client, world)
    assert set_status(client, item["id"], "quoted").status_code == 422
    back = set_status(client, item["id"], "quoted", note="nouveau devis")
    assert (
        back.status_code == 200 and back.json()["approvedUnitNetCents"] == 124_313
    )  # snapshot kept
    assert (
        client.get(f"/api/v1/projects/{world['project'].id}/summary").json()["approvedCents"] == 0
    )


def test_replace_product_after_approval(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    old = approved_lamp(client, world)
    other = make_product(
        session,
        clock,
        name="Melt",
        category_id=world["lum"].id,
        supplier_id=world["dixon"].id,
        list_price_cents=90_000,
        list_price_currency="GBP",
    )
    too_early = client.post(
        f"/api/v1/project-items/{old['id'] + 100}/replace", json={"productId": other.id}
    )
    assert too_early.status_code == 404
    new = client.post(
        f"/api/v1/project-items/{old['id']}/replace",
        json={"productId": other.id, "note": "rupture"},
    )
    assert new.status_code == 201, new.text
    body = new.json()
    assert (
        body["itemCode"] == "LUM-001"
        and body["status"] == "specified"
        and body["approvedAt"] is None
    )
    assert (
        body["unitCostCents"] == 90_000 and body["currency"] == "GBP" and body["fxRateMicro"] == GBP
    )
    assert [pl["zoneId"] for pl in body["placements"]] == [world["lob"].id, world["cha"].id]
    previous = client.get(f"/api/v1/project-items/{old['id']}").json()
    assert (
        previous["itemCode"] == "LUM-001.R1"
        and previous["status"] == "replaced"
        and previous["replacedById"] == body["id"]
    )
    assert previous["placements"] == []
    summary = client.get(f"/api/v1/projects/{world['project'].id}/summary").json()
    assert (
        summary["approvedCents"] == 0 and summary["specifiedCents"] == 1_253_070
    )  # 900 × 0,85 × 1,17 × 14
    assert (
        client.post(
            f"/api/v1/project-items/{body['id']}/replace", json={"productId": other.id}
        ).status_code
        == 409
    )


def test_catalogue_change_never_touches_the_line_unless_refreshed(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = approved_lamp(client, world)
    client.patch(f"/api/v1/products/{world['lamp'].id}", json={"listPriceCents": 200_000})
    assert client.get(f"/api/v1/project-items/{item['id']}").json()["unitCostCents"] == 125_000
    refreshed = client.post(f"/api/v1/project-items/{item['id']}/refresh").json()
    assert refreshed["unitCostCents"] == 200_000
    events = client.get(f"/api/v1/project-items/{item['id']}/events").json()
    assert events[-1]["kind"] == "price" and events[-1]["note"] == "catalogue"


def test_delete_is_bounded_to_pristine_drafts(client: TestClient, world: dict[str, Any]) -> None:
    item = post_item(
        client,
        world["project"].id,
        {
            "categoryId": world["lum"].id,
            "name": "A",
            "kind": "custom",
            "placements": [{"zoneId": world["lob"].id, "qtyMilli": 1000}],
        },
    ).json()
    set_status(client, item["id"], "specified")
    set_status(client, item["id"], "draft")
    assert client.delete(f"/api/v1/project-items/{item['id']}").status_code == 409  # has history
    assert set_status(client, item["id"], "cancelled", note="abandon").status_code == 200


def test_closed_project_locks_its_lines(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    item = post_item(client, p, {"categoryId": world["lum"].id, "name": "A"}).json()
    client.post(f"/api/v1/projects/{p}/status", json={"status": "closed"})
    assert post_item(client, p, {"categoryId": world["lum"].id, "name": "B"}).status_code == 409
    assert (
        client.patch(f"/api/v1/project-items/{item['id']}", json={"name": "B"}).status_code == 409
    )
    assert set_status(client, item["id"], "specified").status_code == 409


def test_list_filters(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    p = world["project"].id
    lamp = post_item(
        client,
        p,
        {
            "productId": world["lamp"].id,
            "fxRateMicro": GBP,
            "placements": [{"zoneId": world["cha"].id, "qtyMilli": 1000}],
        },
    ).json()
    make_item(session, clock, p, name="Rideau", category_id=world["lum"].id, kind="custom")
    url = f"/api/v1/projects/{p}/project-items"
    assert [i["name"] for i in client.get(url).json()] == ["Beat Light Fat", "Rideau"]
    assert [i["id"] for i in client.get(url, params={"kind": "custom"}).json()] != [lamp["id"]]
    assert [i["id"] for i in client.get(url, params={"supplierId": world["dixon"].id}).json()] == [
        lamp["id"]
    ]
    assert [i["name"] for i in client.get(url, params={"q": "ride"}).json()] == ["Rideau"]
    assert client.get(url, params={"status": "quoted"}).json() == []
    assert client.get("/api/v1/projects/999/project-items").status_code == 404


def test_summary_computes_the_latest_order_date_and_the_overdue_flag(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    soon = post_item(
        client,
        p,
        {"productId": world["lamp"].id, "fxRateMicro": GBP, "requiredOnSite": "2026-12-01"},
    ).json()
    late = post_item(
        client, p, {"productId": world["lamp"].id, "requiredOnSite": "2027-06-01"}
    ).json()
    unknown = post_item(client, p, {"categoryId": world["lum"].id, "name": "Sans date"}).json()
    lines = {
        line["projectItemId"]: line
        for line in client.get(f"/api/v1/projects/{p}/summary").json()["lines"]
    }
    assert (
        lines[soon["id"]]["orderBy"] == "2026-09-22" and lines[soon["id"]]["orderOverdue"] is True
    )  # 8 weeks + 14 days before, clock = 2026-10-09
    assert (
        lines[late["id"]]["orderBy"] == "2027-03-23" and lines[late["id"]]["orderOverdue"] is False
    )
    assert lines[unknown["id"]]["orderBy"] is None and lines[unknown["id"]]["orderOverdue"] is False
    client.patch(f"/api/v1/project-items/{soon['id']}", json={"onHold": True})
    assert client.get(f"/api/v1/projects/{p}/summary").json()["lines"][0]["orderOverdue"] is False
