"""Exports xlsx (ROADMAP F1, ADR-0009) : totaux Excel = totaux de la synthèse ; variante client sans
prix d'achat ni fournisseur ; une ligne par placement ; export émis conservé et listé."""

from io import BytesIO
from typing import Any

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from sqlalchemy.orm import Session

from conftest import make_category, make_product, make_project, make_supplier, make_zone
from ffe.deps import Clock

GBP = 1_170_000


@pytest.fixture
def world(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    """LUM-001 lampe LOB ×1 (qté 2) + CHA ×12 (qté 1) = 17 403,82 € ; LUM-002 frais 300 € ; LUM-003 annulée."""
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
        lead_time_weeks=8,
    )
    base = f"/api/v1/projects/{project.id}/project-items"
    client.post(
        base,
        json={
            "productId": lamp.id,
            "fxRateMicro": GBP,
            "clientDescription": "Suspension laiton",
            "placements": [
                {"zoneId": lob.id, "qtyMilli": 2000},
                {"zoneId": cha.id, "qtyMilli": 1000},
            ],
        },
    )
    client.post(
        base,
        json={
            "name": "Transport",
            "categoryId": lum.id,
            "kind": "fee",
            "supplierId": dixon.id,
            "unitCostCents": 30_000,
            "discountBp": 0,
            "currency": "EUR",
            "placements": [],
        },
    )
    cancelled = client.post(
        base,
        json={
            "name": "Abandonnée",
            "categoryId": lum.id,
            "kind": "custom",
            "unitCostCents": 100,
            "placements": [{"zoneId": lob.id, "qtyMilli": 1000}],
        },
    ).json()
    client.post(
        f"/api/v1/project-items/{cancelled['id']}/status",
        json={"status": "cancelled", "note": "abandon"},
    )
    client.put(
        f"/api/v1/projects/{project.id}/budget-lines", json={"lines": [{"amountCents": 5_000_000}]}
    )
    return {"project": project}


def sheet_rows(data: bytes, title: str) -> list[list[Any]]:
    workbook = load_workbook(BytesIO(data), data_only=True)
    return [list(row) for row in workbook[title].iter_rows(values_only=True)]


def test_internal_schedule_matches_the_summary_to_the_cent(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    summary = client.get(f"/api/v1/projects/{p}/summary").json()
    response = client.get(f"/api/v1/projects/{p}/exports/schedule.xlsx")
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/vnd.openxmlformats")
    assert "schedule-interne-2026-10-09.xlsx" in response.headers["content-disposition"]
    rows = sheet_rows(response.content, "Schedule")
    assert rows[0][:5] == ["Zone", "Nom de zone", "×", "Code", "Désignation"]
    body = [r for r in rows[1:] if r[3]]
    assert [(r[0], r[3], r[8], r[9]) for r in body] == [
        ("LOB", "LOB-LUM-01", 2, 14),
        ("CHA", "LOB-LUM-01", 1, 14),
        (None, "LUM-01", 1, 1),  # fee, unassigned placement (empty zone cell reads back as None)
    ]
    lamp = body[0]
    assert lamp[7] == "Tom Dixon" and lamp[10] == 1062.5 and lamp[11] == "GBP"
    assert lamp[12] == 1243.13 and lamp[13] == 17403.82 and lamp[15] == 8
    totals = {r[12]: r[13] for r in rows if r[12] in ("Prescrit HT €", "TVA €", "TTC €")}
    assert totals["Prescrit HT €"] == summary["specifiedCents"] / 100 == 17703.82
    assert (
        totals["TVA €"] == summary["vatCents"] / 100
        and totals["TTC €"] == summary["ttcCents"] / 100
    )
    budget = sheet_rows(response.content, "Budget")
    assert budget[1][:4] == ["Global", 1, 50000, 17703.82]
    assert budget[1][6] == (5_000_000 - summary["specifiedCents"]) / 100
    zone_rows = {r[0]: r for r in budget[2:]}
    assert zone_rows["Zone Chambre type A"][3] == 14917.56
    # No formula anywhere: every cell is a value.
    workbook = load_workbook(BytesIO(response.content))
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                assert not (isinstance(cell.value, str) and cell.value.startswith("="))


def test_client_variant_has_no_purchase_prices_suppliers_or_fees(
    client: TestClient, world: dict[str, Any]
) -> None:
    p = world["project"].id
    response = client.get(f"/api/v1/projects/{p}/exports/schedule.xlsx?variant=client")
    assert response.status_code == 200
    rows = sheet_rows(response.content, "Schedule")
    assert rows[0] == [
        "Zone",
        "Nom de zone",
        "×",
        "Code",
        "Désignation",
        "Type",
        "Finition",
        "Qté / zone",
        "Qté totale",
        "Statut",
        "Description client",
    ]
    body = [r for r in rows[1:] if r and r[3]]
    assert [r[3] for r in body] == ["LOB-LUM-01", "LOB-LUM-01"]  # no fee, no cancelled line
    assert body[0][10] == "Suspension laiton"
    flat = " ".join(str(c) for r in rows for c in r if c is not None)
    assert "Tom Dixon" not in flat and "1243" not in flat and "17403" not in flat
    workbook = load_workbook(BytesIO(response.content))
    assert workbook.sheetnames == ["Schedule", "Projet"]


def test_each_issue_is_kept_and_listed(client: TestClient, world: dict[str, Any]) -> None:
    p = world["project"].id
    client.get(f"/api/v1/projects/{p}/exports/schedule.xlsx?variant=client")
    client.get(f"/api/v1/projects/{p}/exports/schedule.xlsx?variant=client")
    client.get(f"/api/v1/projects/{p}/exports/schedule.xlsx")
    issued = client.get(f"/api/v1/projects/{p}/exports").json()
    assert [(e["kind"], e["variant"]) for e in issued] == [
        ("schedule_xlsx", "internal"),
        ("schedule_xlsx", "client"),
        ("schedule_xlsx", "client"),
    ]
    assert issued[1]["fileId"] == issued[2]["fileId"]  # identical bytes: one file, two issues
    assert issued[0]["originalName"].endswith("schedule-interne-2026-10-09.xlsx")
    content = client.get(f"/api/v1/files/{issued[0]['fileId']}/content")
    assert content.status_code == 200 and content.content[:2] == b"PK"
    assert client.get("/api/v1/projects/999/exports/schedule.xlsx").status_code == 404
    assert client.get(f"/api/v1/projects/{p}/exports/schedule.xlsx?variant=x").status_code == 422
