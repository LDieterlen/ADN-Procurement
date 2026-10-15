"""PDF exports (ADR-0010, ADR-0013): spec sheets (cover + list + one sheet per article per
location, photo, supplier contact, never a price, revision letters), listing (amounts, statuses),
documents kept and listed."""

import base64
import itertools
from datetime import date, timedelta
from io import BytesIO
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session

from conftest import (
    FIXED_NOW,
    PNG_BYTES,
    make_category,
    make_location,
    make_project,
    make_supplier,
)
from ffe.config import Settings
from ffe.deps import Clock
from ffe.exports.pdf import (
    BAND_BOXES,
    ImageTraits,
    band_layout,
    cents_text,
    count_pages,
    image_traits,
    milli_text,
    padded_image,
    render_html,
)
from ffe.exports.prescription import article_rows, list_context, sheets_context

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
    dixon = make_supplier(
        session,
        clock,
        name="Tom Dixon",
        contact_name="Jean Exemple",
        phone="06 00 00 00 01",
        email="jean@example.com",
        currency="GBP",
    )
    base = f"/api/v1/projects/{project.id}/project-items"
    item = client.post(
        base,
        json={
            "name": "Beat Light Fat",
            "productName": "Beat Light Fat, suspension en laiton",
            "categoryId": lud.id,
            "reference": "BLS01",
            "supplierId": dixon.id,
            "finish": "laiton",
            "dimensions": "Ø 36 × H 30 cm",
            "sourceUrl": "https://example.com/beat",
            "comments": "Suspension laiton noir",
            "unitCostCents": 125_000,
            "discountBp": 1500,
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
    context = sheets_context(
        session, world["project"].id, clock().date(), "A", files_dir=settings.files_dir
    )
    assert context["agency"]["name"] == "Atelier X" and context["indice"] == "A"
    assert [loc["name"] for loc in context["locations"]] == ["Lobby", "Chambre typo A"]
    lobby, room = context["locations"]
    assert [a["item_code"] for a in lobby["articles"]] == ["LOB-LUD-01", "LOB-LUD-02"]
    assert [a["item_code"] for a in room["articles"]] == ["CHA-LUD-01"]  # ADR-0018
    beat = lobby["articles"][0]
    assert beat["reference"] == "BLS01" and beat["supplier_name"] == "Tom Dixon"
    assert beat["representative"] == "Jean Exemple" and beat["email"] == "jean@example.com"
    assert (
        beat["photo"] == world["photo"]["sha256"] + ".png"
        and beat["link"] == "https://example.com/beat"
    )
    assert room["articles"][0]["qty_text"] == "1" and room["articles"][0]["qty_total_text"] == "14"
    html = render_html("sheets.html", context)
    assert "125" not in html.replace("1 250", "") or "1 250,00" not in html
    assert "€" not in html and "Livraison" not in html
    assert "Jean Exemple" in html and "Ø 36 × H 30 cm" in html
    assert "Beat Light Fat</h1>" in html  # the designation as the title
    assert "Beat Light Fat, suspension en laiton" in html  # the name, in the « Nom » cell
    assert count_pages(html, settings.files_dir) == 1 + 1 + 3  # cover, list, three sheets


def test_sheet_image_band_takes_photo_then_finish_then_plan_images_only(
    client: TestClient, world: dict[str, Any], session: Session, settings: Settings, clock: Clock
) -> None:
    """Spec « Fiche 1b » v2: one photo, one finish, one plan at most, in that order; a PDF plan is
    not drawn; without a photo the first image left takes the large box."""
    url = f"/api/v1/project-items/{world['other']['id']}/files"

    def attach(name: str, data: bytes, mime: str, kind: str) -> None:
        stored = client.post("/api/v1/files", files={"file": (name, data, mime)}).json()
        assert client.post(url, json={"fileId": stored["id"], "kind": kind}).status_code == 201

    attach("plan.pdf", b"%PDF-1.4\n" + b"%" * 64, "application/pdf", "drawing")
    attach("plan.png", PNG_BYTES + b"plan", "image/png", "drawing")
    attach("bois.png", PNG_BYTES + b"bois", "image/png", "finish")

    def band() -> list[str]:
        context = sheets_context(
            session, world["project"].id, clock().date(), files_dir=settings.files_dir
        )
        table = next(a for a in context["locations"][0]["articles"] if a["name"] == "Table basse")
        return [image["label"] for image in table["band"]]

    assert band() == ["Finition", "Plan"]  # no photo: the finish takes the large box
    attach("table.png", PNG_BYTES + b"table", "image/png", "image")
    assert band() == ["Photo", "Finition", "Plan"]
    context = sheets_context(
        session, world["project"].id, clock().date(), files_dir=settings.files_dir
    )
    html = render_html("sheets.html", context)
    assert html.count('class="img') >= 3 + 2  # three boxes for the table, the photo of Beat Light
    assert count_pages(html, settings.files_dir) == 1 + 1 + 3  # still one page per sheet


def test_band_keeps_the_fixed_grid_cuts_scenes_and_extends_studio_backdrops(
    tmp_path: Path,
) -> None:
    """Spec « Fiche 1b » v2: the boxes never move; a finish or a room fills its box, a studio
    photo is shown whole with its backdrop stretched to the box, a busy plan whole on white."""
    studio = tmp_path / "studio.png"  # square product shot: light grey backdrop, dark product
    shot = Image.new("RGB", (400, 400), (243, 241, 238))
    shot.paste((90, 60, 40), (150, 120, 250, 300))
    shot.save(studio)
    room = tmp_path / "room.png"  # busy edges: a two-tone picture, 3:2
    picture = Image.new("RGB", (900, 600), (40, 90, 60))
    picture.paste((200, 120, 80), (0, 0, 450, 600))
    picture.save(room)
    square, scene = image_traits(studio), image_traits(room)
    assert square == ImageTraits(1.0, True, True) and scene == ImageTraits(1.5, False, False)

    (alone,) = band_layout([(square, "image")])  # 1:1 in 706 × 330: whole, backdrop extended
    assert alone == {"box": (0, 0, 706, 330), "mode": "extend"}
    photo, finish, plan = band_layout([(scene, "image"), (square, "finish"), (scene, "drawing")])
    assert [p["box"] for p in (photo, finish, plan)] == BAND_BOXES[3]  # aligned on the margins
    assert photo["mode"] == finish["mode"] == "cover"  # a room loses its edges, a material too
    assert plan == {"box": BAND_BOXES[3][2], "mode": "fill", "color": (255, 255, 255)}
    assert image_traits(tmp_path / "missing.png") == ImageTraits(1.0, False, False)

    # The padded image: the product whole in the middle, the backdrop carried to the edges.
    uri = padded_image(studio, (706, 330), None)
    assert uri is not None and uri.startswith("data:image/jpeg;base64,")
    padded = Image.open(BytesIO(base64.b64decode(uri.split(",", 1)[1]))).convert("RGB")
    assert padded.size == (1412, 660)

    def rgb(x: int, y: int) -> tuple[int, ...]:
        value = padded.getpixel((x, y))
        assert isinstance(value, tuple)
        return tuple(int(c) for c in value)

    for corner in [(0, 0), (1411, 659), (0, 659)]:  # far from the photo: still its backdrop
        assert all(abs(a - b) <= 6 for a, b in zip(rgb(*corner), (243, 241, 238), strict=True))
    assert rgb(706, 400)[0] < 120  # the product, not stretched away
    assert padded_image(tmp_path / "missing.png", (100, 100), None) is None


def test_indice_is_declared_on_the_project_never_by_an_export(
    client: TestClient, world: dict[str, Any]
) -> None:
    pid = world["project"].id
    trial = client.get(f"/api/v1/projects/{pid}/exports/sheets.pdf")  # a trial PDF
    assert trial.status_code == 200 and trial.content.startswith(b"%PDF")
    assert "-fiches-2026-10-09.pdf" in trial.headers["content-disposition"]
    assert {i["indice"] for i in client.get(f"/api/v1/projects/{pid}/project-items").json()} == {
        None
    }
    declared = client.post(f"/api/v1/projects/{pid}/indice")
    assert declared.status_code == 200, declared.text
    assert declared.json()["indice"] == "A" and declared.json()["indiceChangedAt"]
    assert {i["indice"] for i in client.get(f"/api/v1/projects/{pid}/project-items").json()} == {
        "A"
    }
    first = client.get(f"/api/v1/projects/{pid}/exports/sheets.pdf")
    assert "-fiches-A-2026-10-09.pdf" in first.headers["content-disposition"]
    client.patch(f"/api/v1/project-items/{world['other']['id']}", json={"finish": "chêne"})
    client.get(f"/api/v1/projects/{pid}/exports/sheets.pdf")  # still A: nothing stamped
    by_id = {
        i["id"]: i["indice"] for i in client.get(f"/api/v1/projects/{pid}/project-items").json()
    }
    assert by_id[world["item"]["id"]] == "A" and by_id[world["other"]["id"]] == "A"
    assert client.post(f"/api/v1/projects/{pid}/indice").json()["indice"] == "B"
    by_id = {
        i["id"]: i["indice"] for i in client.get(f"/api/v1/projects/{pid}/project-items").json()
    }
    assert by_id[world["item"]["id"]] == "A" and by_id[world["other"]["id"]] == "B"
    client.get(f"/api/v1/projects/{pid}/exports/sheets.pdf")
    exports = client.get(f"/api/v1/projects/{pid}/exports").json()
    assert [e["indice"] for e in exports] == ["B", "A", "A", None]
    assert exports[0]["originalName"].endswith("-fiches-B-2026-10-09.pdf")
    # A wrong click: the last declaration is taken back, letters restored, journaled.
    reverted = client.delete(f"/api/v1/projects/{pid}/indice")
    assert reverted.status_code == 200 and reverted.json()["indice"] == "A"
    by_id = {
        i["id"]: i["indice"] for i in client.get(f"/api/v1/projects/{pid}/project-items").json()
    }
    assert by_id[world["item"]["id"]] == "A" and by_id[world["other"]["id"]] == "A"
    events = client.get(f"/api/v1/project-items/{world['other']['id']}/events").json()
    assert [(e["kind"], e["oldValue"], e["newValue"]) for e in events if e["kind"] == "indice"][
        -2:
    ] == [("indice", "A", "B"), ("indice", "B", "A")]
    assert client.post(f"/api/v1/projects/{pid}/indice").json()["indice"] == "B"  # declared anew
    assert client.delete(f"/api/v1/projects/{pid}/indice").json()["indice"] == "A"
    none = client.delete(f"/api/v1/projects/{pid}/indice").json()
    assert none["indice"] is None and none["indiceChangedAt"] is None
    assert {i["indice"] for i in client.get(f"/api/v1/projects/{pid}/project-items").json()} == {
        None
    }
    assert (
        client.delete(f"/api/v1/projects/{pid}/indice").status_code == 409
    )  # nothing to take back
    client.post(f"/api/v1/projects/{pid}/status", json={"status": "closed"})
    assert client.post(f"/api/v1/projects/{pid}/indice").status_code == 409  # read-only project


def test_next_letter_goes_excel_style() -> None:
    from ffe.services.project import next_letter

    assert [next_letter(x) for x in (None, "A", "Y", "Z", "AZ", "ZZ")] == [
        "A",
        "B",
        "Z",
        "AA",
        "BA",
        "AAA",
    ]


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


def test_an_option_follows_its_base_in_the_rows_with_its_letter_and_bracketed_amount(
    client: TestClient, world: dict[str, Any], session: Session, settings: Settings
) -> None:
    """ADR-0021: one row per base placement, code with the letter, amount indicative."""
    base_item = world["item"]
    created = client.post(
        f"/api/v1/projects/{world['project'].id}/project-items",
        json={
            "name": "Variante",
            "categoryId": base_item["categoryId"],
            "optionOfId": base_item["id"],
        },
    )
    assert created.status_code == 201, created.text
    rows = article_rows(session, world["project"].id)
    codes = [r["item_code"] for r in rows]
    for placement in base_item["placements"]:
        assert codes.index(f"{placement['code']}-A") == codes.index(placement["code"]) + 1
    option_rows = [r for r in rows if r["option"] == "A"]
    assert option_rows and all(r["total_ht_text"].startswith("(") for r in option_rows)
    # The option's sheet is told apart: its own page style and a badge naming the base code.
    context = sheets_context(
        session, world["project"].id, date(2026, 10, 15), files_dir=settings.files_dir
    )
    html = render_html("sheets.html", context)
    first = base_item["placements"][0]["code"]
    assert f"Option A</span>Alternative à {first}" in html
    assert html.count('class="page sheet option"') == len(option_rows)
