"""Budgets (ROADMAP étape 8) : global 50 000 € et « Chambres » 30 000 €, Prescrit/Reste cohérents avec
les lignes, annuler libère, deux budgets globaux → 409, alertes 90/100 %, tableau de bord."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_category, make_product, make_project, make_supplier, make_zone
from ffe.deps import Clock

GBP = 1_170_000


@pytest.fixture
def world(session: Session, clock: Clock) -> dict[str, Any]:
    project = make_project(session, clock, name="Hôtel X", contingency_bp=1000)
    lob = make_zone(session, clock, project.id, code="LOB", name="Lobby", multiplier=1)
    cha = make_zone(session, clock, project.id, code="CHA", name="Chambre type A", multiplier=12)
    lum = make_category(session, clock, name="Luminaires", code="LUM")
    txt = make_category(session, clock, name="Textiles", code="TXT")
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
    return {"project": project, "lob": lob, "cha": cha, "lum": lum, "txt": txt, "lamp": lamp}


def put(client: TestClient, project_id: int, lines: list[dict[str, Any]]) -> Any:
    return client.put(f"/api/v1/projects/{project_id}/budget-lines", json={"lines": lines})


def lamp_line(
    client: TestClient,
    world: dict[str, Any],
    placements: list[dict[str, Any]],
    approve: bool = False,
) -> dict[str, Any]:
    item = client.post(
        f"/api/v1/projects/{world['project'].id}/project-items",
        json={"productId": world["lamp"].id, "fxRateMicro": GBP, "placements": placements},
    ).json()
    if approve:
        for status in ("specified", "quoted", "approved"):
            assert (
                client.post(
                    f"/api/v1/project-items/{item['id']}/status", json={"status": status}
                ).status_code
                == 200
            )
    return item


def test_put_replaces_all_lines_and_rejects_two_global_budgets(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    first = put(
        client,
        p,
        [
            {"amountCents": 5_000_000},
            {"zoneId": world["cha"].id, "amountCents": 3_000_000, "notes": "15 000 € par clé × 2"},
        ],
    )
    assert first.status_code == 200, first.text
    assert [(b["zoneId"], b["amountCents"]) for b in first.json()] == [
        (None, 5_000_000),
        (world["cha"].id, 3_000_000),
    ]
    again = put(client, p, [{"amountCents": 4_000_000}])
    assert [b["amountCents"] for b in again.json()] == [4_000_000]  # replaced in bulk
    assert client.get(f"/api/v1/projects/{p}/budget-lines").json()[0]["amountCents"] == 4_000_000
    two_global = put(client, p, [{"amountCents": 1}, {"amountCents": 2}])
    assert two_global.status_code == 409 and "même périmètre" in two_global.json()["message"]
    bad_zone = put(client, p, [{"zoneId": 999, "amountCents": 1}])
    assert (
        bad_zone.status_code == 422 and bad_zone.json()["details"][0]["field"] == "lines.0.zoneId"
    )
    negative = put(client, p, [{"amountCents": -1}])
    assert negative.status_code == 422


def test_parent_and_child_category_cannot_both_have_a_budget_for_the_same_zone(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    child = make_category(session, clock, name="Applique", code=None, parent_id=world["lum"].id)
    p = world["project"].id
    blocked = put(
        client,
        p,
        [
            {"categoryId": world["lum"].id, "amountCents": 100},
            {"categoryId": child.id, "amountCents": 50},
        ],
    )
    assert (
        blocked.status_code == 422 and "sous-catégorie" in blocked.json()["details"][0]["message"]
    )
    ok = put(
        client,
        p,
        [
            {"categoryId": world["lum"].id, "amountCents": 100},
            {"zoneId": world["cha"].id, "categoryId": child.id, "amountCents": 50},
        ],
    )
    assert ok.status_code == 200  # different zone scope


def test_summary_budget_specified_approved_remaining_by_zone(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    put(
        client,
        p,
        [{"amountCents": 5_000_000}, {"zoneId": world["cha"].id, "amountCents": 3_000_000}],
    )
    lamp_line(
        client,
        world,
        [
            {"zoneId": world["lob"].id, "qtyMilli": 2000},
            {"zoneId": world["cha"].id, "qtyMilli": 1000},
        ],
        approve=True,
    )
    summary = client.get(f"/api/v1/projects/{p}/summary").json()
    budget = summary["budget"]
    assert (
        budget["globalCents"] == 5_000_000
        and budget["contingencyBp"] == 1000
        and budget["contingencyCents"] == 500_000
    )
    assert budget["specifiedCents"] == 1_740_382 and budget["approvedCents"] == 1_740_382
    assert budget["remainingCents"] == 5_000_000 - 1_740_382 and budget["alert"] == "none"
    rows = {r["label"]: r for r in budget["byZone"]}
    cha = rows["Chambre type A"]
    assert (
        cha["budgetCents"] == 3_000_000
        and cha["specifiedCents"] == 1_491_756
        and cha["approvedCents"] == 1_491_756
    )
    assert cha["remainingCents"] == 3_000_000 - 1_491_756 and cha["multiplier"] == 12
    lob = rows["Lobby"]
    assert (
        lob["budgetCents"] is None
        and lob["specifiedCents"] == 248_626
        and lob["remainingCents"] is None
    )
    by_category = {r["label"]: r for r in budget["byCategory"]}
    assert by_category["LUM — Luminaires"]["specifiedCents"] == 1_740_382
    assert by_category["LUM — Luminaires"]["approvedCents"] == 1_740_382
    assert "engagedCents" not in budget  # « Engagé » arrives at step 10b


def test_cancelling_a_line_frees_the_budget(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    put(client, p, [{"amountCents": 5_000_000}])
    item = lamp_line(client, world, [{"zoneId": world["cha"].id, "qtyMilli": 1000}])
    before = client.get(f"/api/v1/projects/{p}/summary").json()["budget"]
    assert before["remainingCents"] == 5_000_000 - 1_491_756
    client.post(
        f"/api/v1/project-items/{item['id']}/status",
        json={"status": "cancelled", "note": "abandon"},
    )
    after = client.get(f"/api/v1/projects/{p}/summary").json()["budget"]
    assert after["specifiedCents"] == 0 and after["remainingCents"] == 5_000_000


def test_alerts_at_90_and_100_percent_and_overdue_orders(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    put(
        client,
        p,
        [{"amountCents": 1_600_000}, {"zoneId": world["cha"].id, "amountCents": 1_500_000}],
    )
    lamp_line(client, world, [{"zoneId": world["cha"].id, "qtyMilli": 1000}])  # 14 917,56 € in CHA
    summary = client.get(f"/api/v1/projects/{p}/summary").json()["budget"]
    assert summary["alert"] == "warning"  # 1 491 756 / 1 600 000 = 93 %
    assert {r["label"]: r["alert"] for r in summary["byZone"]}[
        "Chambre type A"
    ] == "warning"  # 1 491 756 / 1 500 000 = 99,45 % : entre 90 et 100 %
    alerts = client.get(f"/api/v1/projects/{p}/alerts").json()
    kinds = sorted(a["kind"] for a in alerts)
    assert kinds == ["budget_90", "budget_90"]
    put(client, p, [{"amountCents": 1_400_000}])
    over = client.get(f"/api/v1/projects/{p}/alerts").json()
    assert over[0]["kind"] == "budget_100" and over[0]["message"].startswith("Projet")
    client.patch(
        f"/api/v1/project-items/{lamp_line(client, world, [{'zoneId': world['lob'].id, 'qtyMilli': 1000}])['id']}",
        json={"requiredOnSite": "2026-10-20", "leadTimeWeeks": 8},
    )
    late = [
        a for a in client.get(f"/api/v1/projects/{p}/alerts").json() if a["kind"] == "order_overdue"
    ]
    assert len(late) == 1 and "LUM-002" in late[0]["message"]


def test_dashboard_lists_open_projects_with_their_figures(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    p = world["project"].id
    put(client, p, [{"amountCents": 5_000_000}])
    lamp_line(client, world, [{"zoneId": world["cha"].id, "qtyMilli": 1000}])
    closed = make_project(session, clock, name="Fini")
    client.post(f"/api/v1/projects/{closed.id}/status", json={"status": "closed"})
    rows = client.get("/api/v1/dashboard").json()
    assert [r["code"] for r in rows] == [world["project"].code]
    row = rows[0]
    assert row["clientName"].startswith("Client") and row["budgetCents"] == 5_000_000
    assert row["specifiedCents"] == 1_491_756 and row["remainingCents"] == 5_000_000 - 1_491_756
    assert row["draftLines"] == 1 and row["onHoldLines"] == 0 and row["overdueLines"] == 0


def test_contingency_defaults_from_settings_and_is_editable(
    client: TestClient, session: Session, clock: Clock
) -> None:
    project = make_project(session, clock, name="Sans contingence précisée")
    assert client.get(f"/api/v1/projects/{project.id}").json()["contingencyBp"] == 1000
    assert (
        client.patch(f"/api/v1/projects/{project.id}", json={"contingencyBp": 500}).json()[
            "contingencyBp"
        ]
        == 500
    )
    assert (
        client.patch(f"/api/v1/projects/{project.id}", json={"contingencyBp": 10001}).status_code
        == 422
    )


def test_closed_project_refuses_budget_changes(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    client.post(f"/api/v1/projects/{p}/status", json={"status": "closed"})
    assert put(client, p, [{"amountCents": 1}]).status_code == 409
