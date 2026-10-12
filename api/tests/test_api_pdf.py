"""Exports PDF (ROADMAP F2, ADR-0010) : book client (une page par article, photo, jamais de prix),
bon de commande (agence, fournisseur, totaux), note de licence imprimée, documents conservés."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import PNG_BYTES, make_category, make_product, make_project, make_supplier, make_zone
from ffe.config import Settings
from ffe.deps import Clock
from ffe.exports.book_pdf import book_context, build_book
from ffe.exports.pdf import cents_text, count_pages, milli_text, render_html
from ffe.exports.po_pdf import po_context

GBP = 1_170_000


@pytest.fixture
def world(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    client.patch(
        "/api/v1/settings", json={"agencyName": "Atelier X", "agencyAddress": "1 rue de la Paix"}
    )
    project = make_project(session, clock, name="Hôtel X", delivery_address="12 rue du Chantier")
    lob = make_zone(session, clock, project.id, code="LOB", name="Lobby", multiplier=1)
    cha = make_zone(session, clock, project.id, code="CHA", name="Chambre type A", multiplier=12)
    lum = make_category(session, clock, name="Luminaires", code="LUM")
    dixon = make_supplier(
        session,
        clock,
        name="Tom Dixon",
        contact_name="Djamel Sabeur",
        phone="06 76 27 17 10",
        email="djamel@example.com",
        currency="GBP",
        default_discount_bp=1500,
        city="London",
        address_line1="4 Pear Tree Court",
    )
    lamp = make_product(
        session,
        clock,
        name="Beat Light Fat",
        supplier_ref="BLS01",
        source_url="https://example.com/beat",
        category_id=lum.id,
        supplier_id=dixon.id,
        list_price_cents=125_000,
        list_price_currency="GBP",
        finish="laiton",
    )
    photo = client.post(
        "/api/v1/files", files={"file": ("beat.png", PNG_BYTES, "image/png")}
    ).json()
    client.post(
        f"/api/v1/products/{lamp.id}/files",
        json={"fileId": photo["id"], "kind": "image", "isPrimary": True},
    )
    client.patch(
        f"/api/v1/products/{lamp.id}/files/{photo['id']}",
        json={"licenseNote": "Photo fournisseur, usage interne"},
    )
    base = f"/api/v1/projects/{project.id}/project-items"
    item = client.post(
        base,
        json={
            "productId": lamp.id,
            "fxRateMicro": GBP,
            "clientDescription": "Suspension laiton noir",
            "heightMm": 300,
            "location": "wall",
            "placements": [
                {"zoneId": lob.id, "qtyMilli": 2000},
                {"zoneId": cha.id, "qtyMilli": 1000},
            ],
        },
    ).json()
    client.post(
        base,
        json={
            "name": "Transport",
            "categoryId": lum.id,
            "kind": "fee",
            "supplierId": dixon.id,
            "unitCostCents": 30_000,
            "currency": "EUR",
            "placements": [],
        },
    )
    return {"project": project, "item": item, "lamp": lamp, "dixon": dixon, "photo": photo}


def test_book_html_has_one_page_per_article_and_never_a_price(
    client: TestClient, session: Session, world: dict[str, Any]
) -> None:
    context = book_context(session, world["project"].id, clock_date())
    assert (
        context["item_count"] == 2 and context["zone_count"] == 2
    )  # one article in each zone, no fee
    assert [z["name"] for z in context["zones"]] == ["Lobby", "Chambre type A"]
    article = context["zones"][1]["articles"][0]
    assert (
        article["item_code"] == "LOB-LUM-01"
        and article["qty_text"] == "1"
        and article["qty_total_text"] == "14"
    )
    assert (
        article["photo"] == f"{world['photo']['sha256']}.png"
        and article["license_note"] == "Photo fournisseur, usage interne"
    )
    assert (
        article["dimensions"] == "H 300 mm"
        and article["client_description"] == "Suspension laiton noir"
    )
    html = render_html("book.html", context)
    assert (
        "Atelier X" in html
        and "Hôtel X" in html
        and "LOB-LUM-01" in html
        and "Transport" not in html
    )
    # The sheet shows the supplier and its representative, never a price.
    assert "Tom Dixon" in html and "Djamel Sabeur" in html and "06 76 27 17 10" in html
    assert "1 062" not in html and "1 243" not in html and "GBP" not in html
    assert "Photo fournisseur, usage interne" in html
    assert article["location"] == "Mur" and article["reference"] == "BLS01"
    assert article["link"] == "https://example.com/beat"
    assert "LISTE" in html and "Localisation" in html and "Validation" in html


def test_each_issue_stamps_a_diffusion_letter_on_the_lines_that_changed(
    client: TestClient, world: dict[str, Any]
) -> None:
    p, item = world["project"].id, world["item"]
    assert client.get(f"/api/v1/project-items/{item['id']}").json()["indice"] is None
    first = client.get(f"/api/v1/projects/{p}/exports/book.pdf")
    assert first.status_code == 200
    assert "prescriptions-A-" in first.headers["content-disposition"]
    assert client.get(f"/api/v1/project-items/{item['id']}").json()["indice"] == "A"
    assert client.get(f"/api/v1/projects/{p}/exports").json()[0]["indice"] == "A"
    other = client.post(
        f"/api/v1/projects/{p}/project-items",
        json={"name": "Nouvelle", "categoryId": item["categoryId"], "kind": "custom"},
    ).json()
    client.get(f"/api/v1/projects/{p}/exports/book.pdf")
    assert client.get(f"/api/v1/project-items/{item['id']}").json()["indice"] == "A"  # unchanged
    assert client.get(f"/api/v1/project-items/{other['id']}").json()["indice"] == "B"  # new line


def test_book_pdf_is_issued_and_kept(
    client: TestClient, session: Session, settings: Settings, world: dict[str, Any]
) -> None:
    p = world["project"].id
    html, _pdf = build_book(session, settings.files_dir, p, clock_date())
    assert count_pages(html, settings.files_dir) == 4  # cover + list + 2 articles
    response = client.get(f"/api/v1/projects/{p}/exports/book.pdf")
    assert response.status_code == 200, response.text
    assert (
        response.headers["content-type"] == "application/pdf" and response.content[:5] == b"%PDF-"
    )
    issued = client.get(f"/api/v1/projects/{p}/exports").json()
    assert [(e["kind"], e["variant"]) for e in issued] == [("book_pdf", "client")]
    assert issued[0]["originalName"].endswith("-prescriptions-A-2026-10-09.pdf")


def test_po_pdf_has_agency_supplier_and_totals_and_is_attached_once(
    client: TestClient, session: Session, world: dict[str, Any]
) -> None:
    p, item = world["project"].id, world["item"]
    for status in ("specified", "quoted", "approved"):
        client.post(f"/api/v1/project-items/{item['id']}/status", json={"status": status})
    po = client.post(
        f"/api/v1/projects/{p}/purchase-orders",
        json={"supplierId": world["dixon"].id, "itemIds": [item["id"]]},
    ).json()
    context = po_context(session, po["id"])
    html = render_html("po.html", context)
    assert (
        "Atelier X" in html
        and "1 rue de la Paix" in html
        and "Tom Dixon" in html
        and "4 Pear Tree Court, London" in html
    )
    assert "12 rue du Chantier" in html and "PO-2026-001" in html and "Brouillon" in html
    assert (
        context["lines"][0]["qty_text"] == "14" and context["lines"][0]["total_text"] == "14 875,00"
    )
    assert (
        context["totals"]["total_eur_text"] == "17 403,82"
        and "Contre-valeur HT EUR (1 GBP = 1,17 €)" in html
    )
    first = client.get(f"/api/v1/purchase-orders/{po['id']}/pdf")
    assert first.status_code == 200 and first.content[:5] == b"%PDF-"
    client.get(f"/api/v1/purchase-orders/{po['id']}/pdf")
    files = client.get(f"/api/v1/purchase-orders/{po['id']}").json()["files"]
    assert (
        len(files) == 1
        and files[0]["caption"] == "BC PO-2026-001 (PDF)"
        and files[0]["ext"] == "pdf"
    )
    assert client.get("/api/v1/purchase-orders/999/pdf").status_code == 404


def test_text_helpers() -> None:
    assert (
        cents_text(1_740_382) == "17 403,82"
        and cents_text(5) == "0,05"
        and cents_text(-150) == "-1,50"
    )
    assert (
        milli_text(14_000) == "14"
        and milli_text(12_500) == "12,5"
        and milli_text(1_250_000) == "1 250"
    )


def clock_date() -> Any:
    from conftest import FIXED_NOW

    return FIXED_NOW.date()
