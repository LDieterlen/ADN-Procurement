"""PDF exports (ADR-0010, ADR-0013): spec sheets (cover + list + one sheet per article per
location, photo, supplier contact, never a price, revision letters), listing (amounts, statuses),
documents kept and listed."""

import itertools
from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import (
    FIXED_NOW,
    PNG_BYTES,
    make_category,
    make_location,
    make_manufacturer,
    make_project,
    make_supplier,
)
from ffe.config import Settings
from ffe.deps import Clock
from ffe.exports.pdf import cents_text, count_pages, milli_text, render_html
from ffe.exports.prescription import list_context, sheets_context

GBP = 1_170_000


@pytest.fixture
def clock() -> Clock:
    """A ticking clock: the revision letter relies on `updated_at` after the last issue."""
    ticks = itertools.count()
    return lambda: FIXED_NOW + timedelta(seconds=next(ticks))


@pytest.fixture
def world(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    client.patch(
        "/api/v1/settings", json={"agencyName": "Atelier X", "agencyAddress": "1 rue de la Paix"}
    )
    project = make_project(session, clock, name="Hôtel X")
    lob = make_location(
        session, clock, project.id, code="LOB", name="Lobby", zone="Zones communes", multiplier=1
    )
    cha = make_location(
        session,
        clock,
        project.id,
        code="CHA",
        name="Chambre typo A",
        zone="Hébergement",
        multiplier=12,
    )
    lud = make_category(session, clock, name="Luminaire décoratif", code="LUD")
    flos = make_manufacturer(session, clock, name="Flos")
    dixon = make_supplier(
        session,
        clock,
        name="Tom Dixon",
        contact_name="Djamel Sabeur",
        phone="06 76 27 17 10",
        email="djamel@example.com",
        currency="GBP",
        default_discount_bp=1500,
    )
    base = f"/api/v1/projects/{project.id}/project-items"
    item = client.post(
        base,
        json={
            "name": "Beat Light Fat",
            "categoryId": lud.id,
            "manufacturerId": flos.id,
            "reference": "BLS01",
            "supplierId": dixon.id,
            "finish": "laiton",
            "dimensions": "Ø 36 × H 30 cm",
            "sourceUrl": "https://example.com/beat",
            "comments": "Suspension laiton noir",
            "unitCostCents": 125_000,
            "fxRateMicro": GBP,
            "placements": [
                {"locationId": lob.id, "qtyMilli": 2000},
                {"locationId": cha.id, "qtyMilli": 1000},
            ],
        },
    ).json()
    photo = client.post(
        "/api/v1/files", files={"file": ("beat.png", PNG_BYTES, "image/png")}
    ).json()
    client.post(
        f"/api/v1/project-items/{item['id']}/files", json={"fileId": photo["id"], "isPrimary": True}
    )
    other = client.post(
        base,
        json={
            "name": "Table basse",
            "categoryId": lud.id,
            "unitCostCents": 40_000,
            "placements": [{"locationId": lob.id}],
        },
    ).json()
    client.post(
        base,
        json={
            "kind": "fee",
            "name": "Livraison",
            "supplierId": dixon.id,
            "unitCostCents": 10_000,
            "currency": "EUR",
        },
    )
    return {
        "project": project,
        "item": item,
        "other": other,
        "photo": photo,
        "lob": lob,
        "cha": cha,
    }


def test_sheets_context_has_one_row_per_placement_without_fees_nor_prices(
    world: dict[str, Any], session: Session, settings: Settings, clock: Clock
) -> None:
    context = sheets_context(session, world["project"].id, clock().date(), "A")
    assert context["agency"]["name"] == "Atelier X" and context["indice"] == "A"
    assert [loc["name"] for loc in context["locations"]] == ["Lobby", "Chambre typo A"]
    lobby, room = context["locations"]
    assert [a["item_code"] for a in lobby["articles"]] == ["LOB-LUD-01", "LOB-LUD-02"]
    assert [a["item_code"] for a in room["articles"]] == ["LOB-LUD-01"]
    beat = lobby["articles"][0]
    assert beat["manufacturer"] == "Flos" and beat["reference"] == "BLS01"
    assert beat["representative"] == "Djamel Sabeur" and beat["email"] == "djamel@example.com"
    assert (
        beat["photo"] == world["photo"]["sha256"] + ".png"
        and beat["link"] == "https://example.com/beat"
    )
    assert room["articles"][0]["qty_text"] == "1" and room["articles"][0]["qty_total_text"] == "14"
    html = render_html("sheets.html", context)
    assert "125" not in html.replace("1 250", "") or "1 250,00" not in html
    assert "€" not in html and "Livraison" not in html
    assert "Djamel Sabeur" in html and "Ø 36 × H 30 cm" in html
    assert count_pages(html, settings.files_dir) == 1 + 1 + 3  # cover, list, three sheets


def test_sheets_pdf_stamps_revision_letters_and_is_kept(
    client: TestClient, world: dict[str, Any]
) -> None:
    pid = world["project"].id
    first = client.get(f"/api/v1/projects/{pid}/exports/sheets.pdf")
    assert first.status_code == 200, first.text
    assert first.headers["content-type"] == "application/pdf" and first.content.startswith(b"%PDF")
    assert "-fiches-A-2026-10-09.pdf" in first.headers["content-disposition"]
    items = client.get(f"/api/v1/projects/{pid}/project-items").json()
    assert {i["indice"] for i in items} == {"A"}
    client.patch(f"/api/v1/project-items/{world['other']['id']}", json={"finish": "chêne"})
    client.get(f"/api/v1/projects/{pid}/exports/sheets.pdf")
    by_id = {
        i["id"]: i["indice"] for i in client.get(f"/api/v1/projects/{pid}/project-items").json()
    }
    assert by_id[world["item"]["id"]] == "A" and by_id[world["other"]["id"]] == "B"
    exports = client.get(f"/api/v1/projects/{pid}/exports").json()
    assert [(e["kind"], e["indice"]) for e in exports] == [("sheets_pdf", "B"), ("sheets_pdf", "A")]
    assert exports[0]["originalName"].endswith("-fiches-B-2026-10-09.pdf")


def test_listing_pdf_shows_amounts_statuses_and_indices(
    client: TestClient, world: dict[str, Any], session: Session, settings: Settings, clock: Clock
) -> None:
    pid = world["project"].id
    client.post(f"/api/v1/project-items/{world['item']['id']}/status", json={"status": "approved"})
    context = list_context(session, pid, clock().date())
    beat = context["locations"][0]["articles"][0]
    assert beat["total_ht_text"] == "17\u202f403,82" and beat["status"] == "Validé"
    html = render_html("list.html", context)
    assert "17\u202f403,82" in html and "Validé" in html and "landscape" in html
    assert count_pages(html, settings.files_dir) >= 1
    response = client.get(f"/api/v1/projects/{pid}/exports/list.pdf")
    assert response.status_code == 200 and response.content.startswith(b"%PDF")
    assert "-listing-2026-10-09.pdf" in response.headers["content-disposition"]
    assert client.get(f"/api/v1/projects/{pid}/exports").json()[0]["kind"] == "list_pdf"
    assert client.get(f"/api/v1/projects/{pid}/project-items").json()[0]["indice"] is None


def test_empty_project_still_renders(client: TestClient, session: Session, clock: Clock) -> None:
    project = make_project(session, clock)
    assert client.get(f"/api/v1/projects/{project.id}/exports/sheets.pdf").status_code == 200
    assert client.get(f"/api/v1/projects/{project.id}/exports/list.pdf").status_code == 200
    assert client.get("/api/v1/projects/999/exports/list.pdf").status_code == 404


def test_text_helpers() -> None:
    assert (
        cents_text(1_740_382) == "17\u202f403,82"
        and cents_text(5) == "0,05"
        and cents_text(None) == ""
    )
    assert milli_text(14_000) == "14" and milli_text(12_500) == "12,5"
