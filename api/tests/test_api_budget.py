"""Budget (ADR-0013): envelopes by scope, summary — Prescrit / Devisé / Validé, by status with
shares, by location / zone / family / type / supplier, filters, alerts. Reference amounts
computed by hand (DATA_MODEL §6)."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_category, make_location, make_project, make_supplier
from ffe.deps import Clock

GBP = 1_170_000


@pytest.fixture
def world(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    project = make_project(session, clock, name="Hôtel X")
    lob = make_location(
        session, clock, project.id, code="LOB", name="Lobby", zone="Zones communes", multiplier=1
    )
    cha = make_location(
        session, clock, project.id, code="CHA", name="Chambre A", zone="Hébergement", multiplier=12
    )
    lud = make_category(session, clock, name="Luminaire décoratif", code="LUD")
    tab = make_category(session, clock, name="Table", code="TAB")
    dixon = make_supplier(
        session, clock, name="Tom Dixon", currency="GBP", default_discount_bp=1500
    )
    wood = make_supplier(session, clock, name="Atelier Bois", currency="EUR")
    base = f"/api/v1/projects/{project.id}/project-items"
    # Lamp: 125 000 GBP −15 % → 106 250 → 124 313 € ; 2 + 12 = 14 → 17 403,82 €
    lamp = client.post(
        base,
        json={
            "name": "Lampe",
            "categoryId": lud.id,
            "supplierId": dixon.id,
            "family": "edition",
            "unitCostCents": 125_000,
            "fxRateMicro": GBP,
            "placements": [
                {"locationId": lob.id, "qtyMilli": 2000},
                {"locationId": cha.id, "qtyMilli": 1000},
            ],
        },
    ).json()
    # Table: 50 000 € × 1 in the lobby → 500,00 €
    table = client.post(
        base,
        json={
            "name": "Table",
            "categoryId": tab.id,
            "supplierId": wood.id,
            "family": "custom",
            "unitCostCents": 50_000,
            "placements": [{"locationId": lob.id, "qtyMilli": 1000}],
        },
    ).json()
    # Fee: 800,00 € for Tom Dixon, no placement
    fee = client.post(
        base,
        json={
            "kind": "fee",
            "name": "Livraison",
            "supplierId": dixon.id,
            "unitCostCents": 80_000,
            "currency": "EUR",
            "discountBp": 0,
        },
    ).json()
    # Cancelled: never counted
    gone = client.post(
        base, json={"name": "Annulée", "categoryId": tab.id, "unitCostCents": 999_999}
    ).json()
    client.post(f"/api/v1/project-items/{gone['id']}/status", json={"status": "cancelled"})
    client.post(f"/api/v1/project-items/{lamp['id']}/status", json={"status": "approved"})
    client.post(f"/api/v1/project-items/{table['id']}/status", json={"status": "quoted"})
    return {
        "project": project,
        "lob": lob,
        "cha": cha,
        "lud": lud,
        "tab": tab,
        "dixon": dixon,
        "wood": wood,
        "lamp": lamp,
        "table": table,
        "fee": fee,
    }


def put(client: TestClient, project_id: int, lines: list[dict[str, Any]]) -> Any:
    return client.put(f"/api/v1/projects/{project_id}/budget-lines", json={"lines": lines})


def summary(client: TestClient, project_id: int, **params: Any) -> Any:
    return client.get(f"/api/v1/projects/{project_id}/summary", params=params).json()


def test_put_replaces_all_lines_and_validates_each_scope(
    client: TestClient, world: dict[str, Any]
) -> None:
    pid = world["project"].id
    first = put(
        client,
        pid,
        [
            {"scope": "global", "amountCents": 2_000_000},
            {"scope": "zone", "zone": " Hébergement ", "amountCents": 1_500_000},
            {"scope": "location", "locationId": world["lob"].id, "amountCents": 300_000},
            {"scope": "family", "family": "edition", "amountCents": 1_800_000},
            {"scope": "supplier", "supplierId": world["dixon"].id, "amountCents": 1_900_000},
        ],
    )
    assert first.status_code == 200, first.text
    assert [b["scope"] for b in first.json()] == [
        "global",
        "zone",
        "location",
        "family",
        "supplier",
    ]
    assert first.json()[1]["zone"] == "Hébergement"
    second = put(client, pid, [{"scope": "global", "amountCents": 1}])
    assert [b["amountCents"] for b in second.json()] == [1]
    dup = put(
        client, pid, [{"scope": "global", "amountCents": 1}, {"scope": "global", "amountCents": 2}]
    )
    assert dup.status_code == 409
    for bad, field in (
        ({"scope": "location", "amountCents": 1}, "lines.0.scope"),
        ({"scope": "global", "zone": "X", "amountCents": 1}, "lines.0.scope"),
        ({"scope": "location", "locationId": 999, "amountCents": 1}, "lines.0.locationId"),
        ({"scope": "family", "family": "other", "amountCents": 1}, "lines.0.family"),
        ({"scope": "supplier", "supplierId": 999, "amountCents": 1}, "lines.0.supplierId"),
        ({"scope": "zone", "zone": " ", "amountCents": 1}, "lines.0.zone"),
    ):
        response = put(client, pid, [bad])
        assert response.status_code == 422, bad
        assert response.json()["details"][0]["field"] == field


def test_summary_totals_by_status_and_by_axis(client: TestClient, world: dict[str, Any]) -> None:
    pid = world["project"].id
    put(
        client,
        pid,
        [
            {"scope": "global", "amountCents": 2_000_000},
            {"scope": "zone", "zone": "Hébergement", "amountCents": 1_500_000},
            {"scope": "supplier", "supplierId": world["wood"].id, "amountCents": 40_000},
        ],
    )
    body = summary(client, pid)
    assert body["budgetCents"] == 2_000_000
    assert body["specifiedCents"] == 1_740_382 + 50_000 + 80_000  # 18 703,82 €
    assert body["quotedCents"] == 1_740_382 + 50_000
    assert body["approvedCents"] == 1_740_382
    assert body["remainingCents"] == 2_000_000 - 1_870_382 and body["alert"] == "warning"
    by_status = {row["status"]: row for row in body["byStatus"]}
    assert by_status["approved"]["count"] == 1 and by_status["approved"]["amountCents"] == 1_740_382
    assert by_status["approved"]["shareBp"] == 9305  # 1 740 382 / 1 870 382
    assert by_status["to_quote"]["amountCents"] == 80_000 and by_status["cancelled"]["count"] == 1
    assert by_status["cancelled"]["amountCents"] == 0 and by_status["cancelled"]["shareBp"] == 0
    assert sum(r["count"] for r in body["byStatus"]) == 4
    # Lobby: lamp 2 × 124 313 = 248 626 + table 50 000 ; Chambre A: 12 × 124 313 = 1 491 756
    locations = {row["key"]: row for row in body["byLocation"]}
    assert locations[str(world["lob"].id)]["specifiedCents"] == 298_626
    assert locations[str(world["cha"].id)]["specifiedCents"] == 1_491_756
    assert locations[str(world["cha"].id)]["approvedCents"] == 1_491_756
    assert locations[str(world["lob"].id)]["quotedCents"] == 298_626
    zones = {row["key"]: row for row in body["byZone"]}
    assert zones["Hébergement"]["budgetCents"] == 1_500_000
    assert zones["Hébergement"]["remainingCents"] == 1_500_000 - 1_491_756
    assert zones["Hébergement"]["alert"] == "warning"  # 99,45 %
    assert zones["Zones communes"]["specifiedCents"] == 298_626
    families = {row["key"]: row for row in body["byFamily"]}
    assert families["edition"]["specifiedCents"] == 1_740_382
    assert (
        families["custom"]["specifiedCents"] == 50_000
        and families["fee"]["specifiedCents"] == 80_000
    )
    types = {row["key"]: row for row in body["byType"]}
    assert types[str(world["lud"].id)]["label"] == "LUD — Luminaire décoratif"
    assert (
        types[str(world["tab"].id)]["specifiedCents"] == 50_000 and types["fee"]["label"] == "Frais"
    )
    suppliers = {row["key"]: row for row in body["bySupplier"]}
    assert suppliers[str(world["dixon"].id)]["specifiedCents"] == 1_740_382 + 80_000
    assert suppliers[str(world["wood"].id)]["remainingCents"] == -10_000
    assert suppliers[str(world["wood"].id)]["alert"] == "over"
    line = next(line for line in body["lines"] if line["projectItemId"] == world["lamp"]["id"])
    assert line["totalQtyMilli"] == 14_000 and line["netUnitEurCents"] == 124_313
    assert line["totalHtCents"] == 1_740_382
    gone = next(line for line in body["lines"] if not line["counted"])
    assert gone["status"] == "cancelled" and gone["totalHtCents"] == 999_999


def test_summary_filters_restrict_lines_and_placements(
    client: TestClient, world: dict[str, Any]
) -> None:
    pid = world["project"].id
    lobby = summary(client, pid, locationId=world["lob"].id)
    assert lobby["specifiedCents"] == 298_626 and lobby["approvedCents"] == 248_626
    assert [r["key"] for r in lobby["byLocation"]] == [str(world["lob"].id)]
    hosting = summary(client, pid, zone="Hébergement")
    assert hosting["specifiedCents"] == 1_491_756
    dixon = summary(client, pid, supplierId=world["dixon"].id)
    assert dixon["specifiedCents"] == 1_740_382 + 80_000
    both = summary(client, pid, supplierId=world["dixon"].id, zone="Zones communes")
    assert both["specifiedCents"] == 248_626  # fee has no zone, table is Atelier Bois
    assert summary(client, pid, family="custom")["specifiedCents"] == 50_000
    assert summary(client, pid, categoryId=world["tab"].id)["quotedCents"] == 50_000


def test_cancelling_frees_the_budget_and_empty_project_is_all_zero(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    pid = world["project"].id
    client.post(f"/api/v1/project-items/{world['lamp']['id']}/status", json={"status": "cancelled"})
    assert summary(client, pid)["specifiedCents"] == 130_000
    empty = make_project(session, clock)
    body = summary(client, empty.id)
    assert body["specifiedCents"] == 0 and body["budgetCents"] is None
    assert body["remainingCents"] is None and body["alert"] == "none"
    assert body["byLocation"] == [] and body["byStatus"][0]["count"] == 0
    assert client.get("/api/v1/projects/999/summary").status_code == 404
