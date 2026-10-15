"""Articles (ADR-0013): codes `<LOC>-<TYPE>-NN`, spec sheet copied from the catalogue or free
(added to the catalogue by default), fee lines, single free status journaled, placements, files."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import (
    PNG_BYTES,
    make_category,
    make_file,
    make_item,
    make_location,
    make_project,
    make_supplier,
)
from ffe.config import Settings
from ffe.deps import Clock

GBP = 1_170_000


@pytest.fixture
def world(session: Session, clock: Clock) -> dict[str, Any]:
    project = make_project(session, clock, name="Hôtel X")
    lob = make_location(
        session, clock, project.id, code="LOB", name="Lobby", zone="Zones communes", multiplier=1
    )
    cha = make_location(
        session, clock, project.id, code="CHA", name="Chambre typo A", multiplier=12
    )
    lud = make_category(session, clock, name="Luminaire décoratif", code="LUD")
    dixon = make_supplier(session, clock, name="Tom Dixon", currency="GBP")
    # The full sheet of an article, typed by hand (ADR-0016: no catalogue).
    lamp = {
        "name": "Beat Light Fat",
        "categoryId": lud.id,
        "productName": "  Beat Light Fat, suspension en laiton  ",
        "reference": "BLS01",
        "supplierId": dixon.id,
        "unitCostCents": 125_000,
        "currency": "GBP",
        "finish": "laiton",
        "dimensions": "Ø 36 × H 30 cm",
        "leadTime": "6 à 8 semaines",
        "sourceUrl": "https://example.com/beat",
    }
    return {
        "project": project,
        "lob": lob,
        "cha": cha,
        "lud": lud,
        "dixon": dixon,
        "lamp": lamp,
    }


def base(world: dict[str, Any]) -> str:
    return f"/api/v1/projects/{world['project'].id}/project-items"


def test_create_with_the_full_sheet_and_the_price(
    client: TestClient, world: dict[str, Any]
) -> None:
    created = client.post(
        base(world),
        json={
            **world["lamp"],
            "discountBp": 1500,
            "fxRateMicro": GBP,
            "placements": [{"locationId": world["cha"].id, "qtyMilli": 2000}],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["itemCode"] == "CHA-LUD-01" and body["status"] == "to_quote"
    assert body["name"] == "Beat Light Fat" and body["reference"] == "BLS01"
    assert body["productName"] == "Beat Light Fat, suspension en laiton"  # trimmed
    assert body["supplierId"] == world["dixon"].id
    assert body["finish"] == "laiton" and body["dimensions"] == "Ø 36 × H 30 cm"
    assert body["leadTime"] == "6 à 8 semaines"
    assert body["sourceUrl"] == "https://example.com/beat"
    assert body["unitCostCents"] == 125_000 and body["currency"] == "GBP"
    assert body["discountBp"] == 1500 and body["fxRateMicro"] == GBP
    assert body["indice"] is None and body["kind"] == "product"
    assert [p["locationId"] for p in body["placements"]] == [world["cha"].id]
    events = client.get(f"/api/v1/project-items/{body['id']}/events").json()
    assert [e["kind"] for e in events] == ["created"]


def test_codes_follow_location_then_type_without_gap_before_the_first_indice(
    client: TestClient, world: dict[str, Any]
) -> None:
    def create(**extra: Any) -> Any:
        body: dict[str, Any] = {"name": "Lampe", "categoryId": world["lud"].id}
        body.update(extra)
        response = client.post(base(world), json=body)
        assert response.status_code == 201, response.text
        return response.json()

    first = create(placements=[{"locationId": world["cha"].id}])
    second = create(placements=[{"locationId": world["cha"].id}])
    lobby = create(placements=[{"locationId": world["lob"].id}])
    nowhere = create()
    assert (first["itemCode"], second["itemCode"]) == ("CHA-LUD-01", "CHA-LUD-02")
    assert lobby["itemCode"] == "LOB-LUD-01" and nowhere["itemCode"] == "LUD-01"
    # ADR-0021: before the first indice, a freed code is closed up (02 becomes 01, journaled).
    assert client.delete(f"/api/v1/project-items/{first['id']}").status_code == 204
    moved = client.get(f"/api/v1/project-items/{second['id']}").json()
    assert moved["itemCode"] == "CHA-LUD-01"
    events = client.get(f"/api/v1/project-items/{second['id']}/events").json()
    assert events[-1]["kind"] == "placement" and '"CHA-LUD-02"' in events[-1]["oldValue"]
    assert create(placements=[{"locationId": world["cha"].id}])["itemCode"] == "CHA-LUD-02"


def test_after_the_first_indice_codes_never_move_and_the_gap_is_filled(
    client: TestClient, world: dict[str, Any]
) -> None:
    def create() -> Any:
        body = {"name": "Lampe", "categoryId": world["lud"].id}
        return client.post(
            base(world), json={**body, "placements": [{"locationId": world["cha"].id}]}
        ).json()

    first, second, third = create(), create(), create()
    assert client.post(f"/api/v1/projects/{world['project'].id}/indice").status_code == 200
    # Moving CHA-LUD-02 elsewhere frees its number; CHA-LUD-03, already issued, does not move.
    placement = second["placements"][0]["id"]
    client.patch(f"/api/v1/placements/{placement}", json={"locationId": world["lob"].id})
    assert client.get(f"/api/v1/project-items/{third['id']}").json()["itemCode"] == "CHA-LUD-03"
    assert create()["itemCode"] == "CHA-LUD-02"  # the smallest free number
    assert first["itemCode"] == "CHA-LUD-01"


def test_before_the_first_indice_any_article_can_be_deleted(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = client.post(base(world), json={"name": "Lampe", "categoryId": world["lud"].id}).json()
    client.post(f"/api/v1/project-items/{item['id']}/status", json={"status": "approved"})
    assert client.delete(f"/api/v1/project-items/{item['id']}").status_code == 204


def test_a_hand_written_code_must_be_free(client: TestClient, world: dict[str, Any]) -> None:
    client.post(
        base(world),
        json={"name": "A", "categoryId": world["lud"].id, "itemCode": "SPECIAL-1"},
    )
    dup = client.post(
        base(world), json={"name": "B", "categoryId": world["lud"].id, "itemCode": "SPECIAL-1"}
    )
    assert dup.status_code == 422 and dup.json()["details"][0]["field"] == "itemCode"


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"categoryId": 1}, "productName"),
        ({"name": "A"}, "categoryId"),
        ({"name": "A", "categoryId": 999}, "categoryId"),
        ({"name": "A", "categoryId": 1, "supplierId": 999}, "supplierId"),
        ({"name": "A", "categoryId": 1, "family": "other"}, "family"),
        ({"name": "A", "categoryId": 1, "usage": "garden"}, "usage"),
        ({"name": "A", "categoryId": 1, "currency": "GBP"}, "fxRateMicro"),
        ({"name": "A", "categoryId": 1, "currency": "EUR", "fxRateMicro": 2}, "fxRateMicro"),
        ({"name": "A", "categoryId": 1, "discountBp": 10001}, "discountBp"),
        ({"name": "A", "categoryId": 1, "quoteUrl": "ftp://x"}, "quoteUrl"),
        ({"name": "A", "categoryId": 1, "placements": [{"locationId": 999}]}, "locationId"),
        ({"kind": "fee", "name": "Livraison"}, "supplierId"),
        ({"kind": "fee", "name": "Livraison", "supplierId": 1, "categoryId": 1}, "kind"),
    ],
)
def test_create_rejects_each_invalid_field(
    client: TestClient, world: dict[str, Any], body: dict[str, Any], field: str
) -> None:
    if body.get("categoryId") == 1:
        body["categoryId"] = world["lud"].id
    if body.get("supplierId") == 1:
        body["supplierId"] = world["dixon"].id
    response = client.post(base(world), json=body)
    assert response.status_code == 422, response.text
    assert response.json()["details"][0]["field"] == field


def test_fx_rate_is_remembered_per_currency_in_the_project(
    client: TestClient, world: dict[str, Any]
) -> None:
    first = client.post(base(world), json={**world["lamp"], "fxRateMicro": 1_200_000}).json()
    second = client.post(base(world), json=world["lamp"]).json()
    assert first["fxRateMicro"] == second["fxRateMicro"] == 1_200_000


def test_fee_line_has_no_type_no_placement_and_a_fee_code(
    client: TestClient, world: dict[str, Any]
) -> None:
    fee = client.post(
        base(world),
        json={
            "kind": "fee",
            "name": "Livraison et emballage",
            "supplierId": world["dixon"].id,
            "unitCostCents": 80_000,
            "fxRateMicro": GBP,
        },
    )
    assert fee.status_code == 201, fee.text
    body = fee.json()
    assert body["itemCode"] == "FR-01" and body["categoryId"] is None and body["placements"] == []
    assert body["currency"] == "GBP" and body["discountBp"] == 0  # no default discount
    refused = client.post(
        f"/api/v1/project-items/{body['id']}/placements", json={"locationId": world["lob"].id}
    )
    assert refused.status_code == 409
    assert client.get(base(world), params={"kind": "fee"}).json()[0]["id"] == body["id"]


def test_patch_sheet_price_and_type_journals_price_and_recodes_placements(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = client.post(
        base(world),
        json={
            **world["lamp"],
            "fxRateMicro": GBP,
            "placements": [{"locationId": world["cha"].id}],
        },
    ).json()
    url = f"/api/v1/project-items/{item['id']}"
    patched = client.patch(
        url,
        json={
            "finish": "laiton noir",
            "family": "edition",
            "usage": "indoor",
            "comments": "Au-dessus du bureau",
            "quoteRef": "DV-118",
            "quoteIndice": "B",
            "quoteUrl": "https://example.com/dv-118.pdf",
            "unitCostCents": 118_000,
            "discountBp": 2000,
        },
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body["finish"] == "laiton noir" and body["family"] == "edition"
    assert body["quoteIndice"] == "B" and body["unitCostCents"] == 118_000
    tab = make_category_via_api(client, "TAB", "Table")
    renumbered = client.patch(url, json={"categoryId": tab}).json()
    assert renumbered["placements"][0]["code"] == renumbered["itemCode"] == "CHA-TAB-01"
    events = client.get(f"{url}/events").json()
    assert [e["kind"] for e in events] == ["created", "price", "placement"]
    assert '"cost":118000' in events[1]["newValue"] and '"discount":2000' in events[1]["newValue"]
    assert '"CHA-LUD-01"' in events[2]["oldValue"] and '"CHA-TAB-01"' in events[2]["newValue"]
    # A product code is never typed by hand (ADR-0018) ; a type change recodes at any status.
    manual = client.patch(url, json={"itemCode": "AUTRE"})
    assert manual.status_code == 422 and manual.json()["details"][0]["field"] == "itemCode"
    client.post(f"{url}/status", json={"status": "quoted"})
    assert (
        client.patch(url, json={"categoryId": world["lud"].id}).json()["itemCode"] == "CHA-LUD-01"
    )
    assert client.patch(url, json={"name": None}).status_code == 422
    assert client.patch(url, json={"categoryId": None}).status_code == 422


def test_each_placement_has_its_code_and_follows_its_location(
    client: TestClient, world: dict[str, Any]
) -> None:
    """ADR-0018: one code per (article, room); moving a placement gives it a new number."""
    item = client.post(
        base(world),
        json={**world["lamp"], "fxRateMicro": GBP, "placements": [{"locationId": world["cha"].id}]},
    ).json()
    assert [p["code"] for p in item["placements"]] == ["CHA-LUD-01"]
    url = f"/api/v1/project-items/{item['id']}/placements"
    added = client.post(url, json={"locationId": None}).json()
    assert [p["code"] for p in added["placements"]] == ["CHA-LUD-01", "LUD-01"]
    assert added["itemCode"] == "CHA-LUD-01 · LUD-01"
    second = added["placements"][1]["id"]
    moved = client.patch(f"/api/v1/placements/{second}", json={"locationId": world["cha"].id})
    assert moved.status_code == 422  # already placed in CHA
    first = added["placements"][0]["id"]
    moved = client.patch(f"/api/v1/placements/{first}", json={"locationId": None})
    assert moved.status_code == 422
    client.delete(f"/api/v1/placements/{second}")
    moved = client.patch(f"/api/v1/placements/{first}", json={"locationId": None}).json()
    assert [p["code"] for p in moved["placements"]] == ["LUD-01"]  # no gap (ADR-0021)


def make_category_via_api(client: TestClient, code: str, name: str) -> int:
    return client.post("/api/v1/categories", json={"code": code, "name": name}).json()["id"]


def test_status_is_free_and_journaled_with_an_optional_note(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = client.post(base(world), json={"name": "A", "categoryId": world["lud"].id}).json()
    url = f"/api/v1/project-items/{item['id']}/status"
    assert client.post(url, json={"status": "purchased"}).json()["status"] == "purchased"
    assert client.post(url, json={"status": "purchased"}).status_code == 409
    assert client.post(url, json={"status": "to_review", "note": " à revoir "}).status_code == 200
    assert client.post(url, json={"status": "cancelled"}).json()["status"] == "cancelled"
    assert client.post(url, json={"status": "approved"}).status_code == 200
    assert client.post(url, json={"status": "nope"}).status_code == 422
    events = client.get(f"/api/v1/project-items/{item['id']}/events").json()
    assert [(e["fromStatus"], e["toStatus"], e["note"]) for e in events[1:]] == [
        ("to_quote", "purchased", None),
        ("purchased", "to_review", "à revoir"),
        ("to_review", "cancelled", None),
        ("cancelled", "approved", None),
    ]


def test_after_the_first_indice_delete_only_a_new_article_without_history(
    client: TestClient, world: dict[str, Any]
) -> None:
    client.post(f"/api/v1/projects/{world['project'].id}/indice")
    item = client.post(base(world), json={"name": "A", "categoryId": world["lud"].id}).json()
    url = f"/api/v1/project-items/{item['id']}"
    client.post(f"{url}/status", json={"status": "quoted"})
    client.post(f"{url}/status", json={"status": "to_quote"})
    blocked = client.delete(url)
    assert blocked.status_code == 409 and "annuler" in blocked.json()["message"]
    fresh = client.post(base(world), json={"name": "B", "categoryId": world["lud"].id}).json()
    assert client.delete(f"/api/v1/project-items/{fresh['id']}").status_code == 204
    assert client.get(f"/api/v1/project-items/{fresh['id']}").status_code == 404


def test_placements_add_update_delete_and_journal(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = client.post(
        base(world),
        json={
            "name": "A",
            "categoryId": world["lud"].id,
            "placements": [{"locationId": world["lob"].id}],
        },
    ).json()
    url = f"/api/v1/project-items/{item['id']}"
    added = client.post(f"{url}/placements", json={"locationId": world["cha"].id, "qtyMilli": 2000})
    assert added.status_code == 201, added.text
    assert [p["locationId"] for p in added.json()["placements"]] == [
        world["lob"].id,
        world["cha"].id,
    ]
    assert client.post(f"{url}/placements", json={"locationId": world["cha"].id}).status_code == 422
    placement_id = added.json()["placements"][1]["id"]
    updated = client.patch(f"/api/v1/placements/{placement_id}", json={"qtyMilli": 3000}).json()
    assert updated["placements"][1]["qtyMilli"] == 3000
    assert (
        client.patch(f"/api/v1/placements/{placement_id}", json={"qtyMilli": None}).status_code
        == 422
    )
    assert client.delete(f"/api/v1/placements/{placement_id}").status_code == 200
    only = item["placements"][0]["id"]
    assert client.delete(f"/api/v1/placements/{only}").status_code == 409  # keeps one
    events = client.get(f"{url}/events").json()
    assert [e["kind"] for e in events] == ["created", "placement", "placement", "placement"]
    assert (
        client.get(base(world), params={"locationId": world["lob"].id}).json()[0]["id"]
        == item["id"]
    )
    assert client.get(base(world), params={"locationId": world["cha"].id}).json() == []


def test_list_filters_and_search(client: TestClient, world: dict[str, Any]) -> None:
    a = client.post(base(world), json={"name": "Applique", "categoryId": world["lud"].id}).json()
    b = client.post(
        base(world),
        json={
            "name": "Lampe",
            "categoryId": world["lud"].id,
            "supplierId": world["dixon"].id,
            "fxRateMicro": GBP,
        },
    ).json()
    client.post(f"/api/v1/project-items/{b['id']}/status", json={"status": "quoted"})
    ids = lambda params: [i["id"] for i in client.get(base(world), params=params).json()]  # noqa: E731
    assert ids({}) == [a["id"], b["id"]]
    assert ids({"status": "quoted"}) == [b["id"]]
    assert ids({"supplierId": world["dixon"].id}) == [b["id"]]
    assert ids({"q": "appli"}) == [a["id"]]
    assert ids({"q": "lud-02"}) == [b["id"]]


def test_files_photo_and_drawing(
    client: TestClient, session: Session, settings: Settings, clock: Clock, world: dict[str, Any]
) -> None:
    item = make_item(session, clock, world["project"].id, category_id=world["lud"].id)
    photo = make_file(session, settings, clock, PNG_BYTES, "a.png")
    drawing = make_file(session, settings, clock, b"%PDF-1.4\n" + b"%" * 64, "plan.pdf")
    url = f"/api/v1/project-items/{item.id}/files"
    attached = client.post(url, json={"fileId": photo.id, "isPrimary": True})
    assert attached.status_code == 201, attached.text
    assert attached.json()["files"][0]["isPrimary"] is True
    plan = client.post(url, json={"fileId": drawing.id, "kind": "drawing"}).json()["files"]
    assert [f["kind"] for f in plan] == ["image", "drawing"]
    bad = client.post(url, json={"fileId": photo.id, "kind": "drawing", "isPrimary": True})
    assert bad.status_code == 409  # already attached
    assert client.patch(f"{url}/{drawing.id}", json={"isPrimary": True}).status_code == 422
    # Sorted by hand: photo · finish · plan ; a main photo sorted as a finish stops being main.
    finish = client.patch(f"{url}/{photo.id}", json={"kind": "finish"})
    assert finish.status_code == 200, finish.text
    assert [(f["kind"], f["isPrimary"]) for f in finish.json()["files"]] == [
        ("finish", False),
        ("drawing", False),
    ]
    assert client.patch(f"{url}/{photo.id}", json={"kind": "colour"}).status_code == 422
    detached = client.delete(f"{url}/{photo.id}")
    assert detached.status_code == 200 and len(detached.json()["files"]) == 1
    assert not (settings.files_dir / photo.filename).exists()


def test_closed_project_refuses_every_write(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    item = make_item(session, clock, world["project"].id, category_id=world["lud"].id)
    client.post(f"/api/v1/projects/{world['project'].id}/status", json={"status": "closed"})
    assert (
        client.post(base(world), json={"name": "A", "categoryId": world["lud"].id}).status_code
        == 409
    )
    assert client.patch(f"/api/v1/project-items/{item.id}", json={"name": "B"}).status_code == 409
    assert (
        client.post(
            f"/api/v1/project-items/{item.id}/status", json={"status": "quoted"}
        ).status_code
        == 409
    )
    assert client.get(f"/api/v1/project-items/{item.id}").status_code == 200
    assert client.get("/api/v1/project-items/999").status_code == 404


def test_the_name_is_required_and_the_designation_defaults_to_it(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = {k: v for k, v in world["lamp"].items() if k != "name"} | {"fxRateMicro": GBP}
    created = client.post(base(world), json=lamp)
    assert created.status_code == 201, created.text
    assert created.json()["name"] == "Beat Light Fat, suspension en laiton"
    bare = client.post(base(world), json={**lamp, "productName": None, "name": "Pied"}).json()
    assert bare["productName"] == "Pied"  # a bare designation is its own name
    none = client.post(base(world), json={**lamp, "productName": "  ", "name": None})
    assert none.status_code == 422
    assert [d["field"] for d in none.json()["details"]] == ["productName"]
    cleared = client.patch(f"/api/v1/project-items/{bare['id']}", json={"productName": None})
    assert cleared.status_code == 422
    assert [d["field"] for d in cleared.json()["details"]] == ["productName"]


# --- options (ADR-0021) -------------------------------------------------------------------------


def _lamp(client: TestClient, world: dict[str, Any], *locations: Any, **extra: Any) -> Any:
    body = {"name": "Lampe", "categoryId": world["lud"].id, **extra}
    if locations:
        body["placements"] = [{"locationId": loc.id} for loc in locations]
    response = client.post(base(world), json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_an_option_takes_the_base_codes_with_a_letter_and_no_placement(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = _lamp(client, world, world["cha"], world["lob"])
    option = _lamp(client, world, optionOfId=lamp["id"], name="Autre lampe")
    assert option["optionOfId"] == lamp["id"] and option["optionLetter"] == "A"
    assert option["placements"] == []
    assert option["itemCode"] == "CHA-LUD-01-A · LOB-LUD-01-A"
    second = _lamp(client, world, optionOfId=lamp["id"])
    assert second["optionLetter"] == "B"
    placements = f"/api/v1/project-items/{option['id']}/placements"
    assert client.post(placements, json={"locationId": None}).status_code == 409
    nested = client.post(
        base(world), json={"name": "X", "categoryId": world["lud"].id, "optionOfId": option["id"]}
    )
    assert nested.status_code == 422 and nested.json()["details"][0]["field"] == "optionOfId"
    assert client.delete(f"/api/v1/project-items/{lamp['id']}").status_code == 409  # has options
    # Deleting option A closes the letters up (before the first indice): B becomes A.
    assert client.delete(f"/api/v1/project-items/{option['id']}").status_code == 204
    assert client.get(f"/api/v1/project-items/{second['id']}").json()["optionLetter"] == "A"


def test_options_are_not_counted_but_have_an_indicative_amount(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = _lamp(client, world, world["cha"], unitCostCents=10_000)
    option = _lamp(client, world, optionOfId=lamp["id"], unitCostCents=30_000)
    summary = client.get(f"/api/v1/projects/{world['project'].id}/summary").json()
    lines = {line["projectItemId"]: line for line in summary["lines"]}
    assert lines[option["id"]]["counted"] is False
    assert lines[option["id"]]["totalHtCents"] == lines[lamp["id"]]["totalHtCents"] * 3
    assert summary["specifiedCents"] == lines[lamp["id"]]["totalHtCents"]


def test_an_existing_article_becomes_an_option_and_frees_its_codes(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = _lamp(client, world, world["cha"])
    other = _lamp(client, world, world["cha"])  # CHA-LUD-02
    third = _lamp(client, world, world["cha"])  # CHA-LUD-03
    url = f"/api/v1/project-items/{lamp['id']}/options"
    attached = client.post(url, json={"projectItemId": other["id"]})
    assert attached.status_code == 200, attached.text
    assert attached.json()["itemCode"] == "CHA-LUD-01-A" and attached.json()["placements"] == []
    assert client.get(f"/api/v1/project-items/{third['id']}").json()["itemCode"] == "CHA-LUD-02"
    refused = client.post(url, json={"projectItemId": lamp["id"]})
    assert refused.status_code == 422


def test_retaining_an_option_swaps_the_roles(client: TestClient, world: dict[str, Any]) -> None:
    lamp = _lamp(client, world, world["cha"], name="Flos")
    first = _lamp(client, world, optionOfId=lamp["id"], name="Artemide")
    second = _lamp(client, world, optionOfId=lamp["id"], name="Poulsen")
    retained = client.post(f"/api/v1/project-items/{second['id']}/retain")
    assert retained.status_code == 200, retained.text
    body = retained.json()
    assert body["optionOfId"] is None and body["itemCode"] == "CHA-LUD-01"
    old = client.get(f"/api/v1/project-items/{lamp['id']}").json()
    assert (old["optionOfId"], old["optionLetter"], old["itemCode"]) == (
        second["id"],
        "B",
        "CHA-LUD-01-B",
    )
    assert client.get(f"/api/v1/project-items/{first['id']}").json()["optionOfId"] == second["id"]
    assert client.post(f"/api/v1/project-items/{second['id']}/retain").status_code == 409
    events = client.get(f"/api/v1/project-items/{second['id']}/events").json()
    assert events[-1]["note"] == "Option B retenue à la place de l'article de base."


def test_an_option_has_the_type_of_its_base(client: TestClient, world: dict[str, Any]) -> None:
    lamp = _lamp(client, world, world["cha"])
    tab = make_category_via_api(client, "TAB", "Table")
    other = client.post(
        base(world), json={"name": "T", "categoryId": tab, "optionOfId": lamp["id"]}
    )
    assert other.status_code == 422 and other.json()["details"][0]["field"] == "categoryId"
    table = client.post(base(world), json={"name": "Table", "categoryId": tab}).json()
    url = f"/api/v1/project-items/{lamp['id']}/options"
    refused = client.post(url, json={"projectItemId": table["id"]})
    assert refused.status_code == 422 and refused.json()["details"][0]["field"] == "projectItemId"
    option = _lamp(client, world, optionOfId=lamp["id"])
    locked = client.patch(f"/api/v1/project-items/{option['id']}", json={"categoryId": tab})
    assert locked.status_code == 422
    client.patch(f"/api/v1/project-items/{lamp['id']}", json={"categoryId": tab})
    moved = client.get(f"/api/v1/project-items/{option['id']}").json()
    assert moved["categoryId"] == tab and moved["itemCode"] == "CHA-TAB-01-A"


def test_a_detached_option_becomes_an_unassigned_article(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = _lamp(client, world, world["cha"])
    first = _lamp(client, world, optionOfId=lamp["id"])
    second = _lamp(client, world, optionOfId=lamp["id"])
    detached = client.post(f"/api/v1/project-items/{first['id']}/detach")
    assert detached.status_code == 200, detached.text
    body = detached.json()
    assert (body["optionOfId"], body["optionLetter"], body["itemCode"]) == (None, None, "LUD-01")
    assert body["placements"][0]["locationId"] is None
    assert client.get(f"/api/v1/project-items/{second['id']}").json()["optionLetter"] == "A"
    assert client.post(f"/api/v1/project-items/{lamp['id']}/detach").status_code == 409


# --- « Enregistrer » : every change at once (2026-10-15) ---------------------------------------


def test_save_applies_sheet_status_placements_and_options_at_once(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = _lamp(client, world, world["cha"])
    other = _lamp(client, world, world["lob"], name="Autre")
    keep = lamp["placements"][0]["id"]
    saved = client.post(
        f"/api/v1/project-items/{lamp['id']}/save",
        json={
            "sheet": {"finish": "laiton"},
            "status": {"status": "quoted", "note": None},
            "placements": [
                {"id": keep, "locationId": world["cha"].id, "qtyMilli": 2000},
                {"locationId": world["lob"].id, "qtyMilli": 1000},
            ],
            "attachOptions": [other["id"]],
        },
    )
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["finish"] == "laiton" and body["status"] == "quoted"
    assert [(p["code"], p["qtyMilli"]) for p in body["placements"]] == [
        ("CHA-LUD-01", 2000),
        ("LOB-LUD-01", 1000),  # the code freed by the option is reused (before the first indice)
    ]
    option = client.get(f"/api/v1/project-items/{other['id']}").json()
    assert option["optionOfId"] == lamp["id"]
    kinds = [e["kind"] for e in client.get(f"/api/v1/project-items/{lamp['id']}/events").json()]
    assert "status" in kinds and "placement" in kinds


def test_save_is_all_or_nothing(client: TestClient, world: dict[str, Any]) -> None:
    lamp = _lamp(client, world, world["cha"])
    refused = client.post(
        f"/api/v1/project-items/{lamp['id']}/save",
        json={"sheet": {"finish": "laiton"}, "placements": []},  # an article keeps a placement
    )
    assert refused.status_code == 409
    assert client.get(f"/api/v1/project-items/{lamp['id']}").json()["finish"] is None


def test_save_can_retain_an_option(client: TestClient, world: dict[str, Any]) -> None:
    lamp = _lamp(client, world, world["cha"])
    option = _lamp(client, world, optionOfId=lamp["id"], name="Variante")
    saved = client.post(
        f"/api/v1/project-items/{option['id']}/save",
        json={"sheet": {"name": "Variante retenue"}, "optionAction": "retain"},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["itemCode"] == "CHA-LUD-01" and saved.json()["name"] == "Variante retenue"


# --- audit 2026-10-15 ---------------------------------------------------------------------------


def _save(client: TestClient, item_id: int, **body: Any) -> Any:
    return client.post(f"/api/v1/project-items/{item_id}/save", json=body)


def test_save_swaps_two_locations_the_codes_staying_with_the_rooms(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = _lamp(client, world, world["cha"], world["lob"])
    cha, lob = item["placements"]
    swapped = _save(
        client,
        item["id"],
        placements=[
            {"id": cha["id"], "locationId": world["lob"].id, "qtyMilli": 3000},
            {"id": lob["id"], "locationId": world["cha"].id, "qtyMilli": 5000},
        ],
    )
    assert swapped.status_code == 200, swapped.text
    by_room = {p["locationId"]: (p["code"], p["qtyMilli"]) for p in swapped.json()["placements"]}
    assert by_room == {world["cha"].id: ("CHA-LUD-01", 5000), world["lob"].id: ("LOB-LUD-01", 3000)}


def test_save_removes_then_re_adds_the_same_location(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = _lamp(client, world, world["cha"], world["lob"])
    lob = item["placements"][1]
    saved = _save(
        client,
        item["id"],
        placements=[
            {"id": lob["id"], "locationId": world["lob"].id, "qtyMilli": 1000},
            {"locationId": world["cha"].id, "qtyMilli": 2000},
        ],
    )
    assert saved.status_code == 200, saved.text
    assert sorted(p["code"] for p in saved.json()["placements"]) == ["CHA-LUD-01", "LOB-LUD-01"]
    dup = _save(
        client,
        item["id"],
        placements=[{"locationId": None, "qtyMilli": 1000}, {"locationId": None, "qtyMilli": 1}],
    )
    assert dup.status_code == 422


def test_renaming_a_location_recodes_its_placements(
    client: TestClient, world: dict[str, Any]
) -> None:
    item = _lamp(client, world, world["cha"])
    renamed = client.patch(f"/api/v1/locations/{world['cha'].id}", json={"code": "CHB"})
    assert renamed.status_code == 200, renamed.text
    assert client.get(f"/api/v1/project-items/{item['id']}").json()["itemCode"] == "CHB-LUD-01"
    assert _lamp(client, world, world["cha"])["itemCode"] == "CHB-LUD-02"


def test_an_option_is_dated_and_journaled_when_its_base_changes(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = _lamp(client, world, world["cha"])
    option = _lamp(client, world, optionOfId=lamp["id"])
    client.post(f"/api/v1/project-items/{lamp['id']}/placements", json={"locationId": None})
    events = client.get(f"/api/v1/project-items/{option['id']}/events").json()
    assert events[-1]["kind"] == "other" and "Article de base modifié" in events[-1]["note"]
    after = client.get(f"/api/v1/project-items/{option['id']}").json()
    assert after["itemCode"] == "CHA-LUD-01-A · LUD-01-A"


def test_a_hand_written_fee_code_never_collides_when_the_series_closes_up(
    client: TestClient, world: dict[str, Any]
) -> None:
    def fee(code: str | None = None) -> Any:
        body = {
            "kind": "fee",
            "name": "Livraison",
            "supplierId": world["dixon"].id,
            "currency": "EUR",
        }
        if code:
            body["itemCode"] = code
        response = client.post(base(world), json=body)
        assert response.status_code == 201, response.text
        return response.json()

    fee("FR-00")
    first, second = fee(), fee()
    assert (first["itemCode"], second["itemCode"]) == ("FR-01", "FR-02")
    assert client.delete(f"/api/v1/project-items/{first['id']}").status_code == 204
    assert client.get(f"/api/v1/project-items/{second['id']}").json()["itemCode"] == "FR-01"


def test_the_code_fr_is_reserved_for_fees(client: TestClient) -> None:
    refused = client.post("/api/v1/categories", json={"code": "fr", "name": "Fresque"})
    assert refused.status_code == 422 and refused.json()["details"][0]["field"] == "code"


def test_deleting_an_article_removes_its_photo_from_the_disk(
    client: TestClient, world: dict[str, Any], settings: Settings
) -> None:
    item = _lamp(client, world, world["cha"])
    stored = client.post("/api/v1/files", files={"file": ("a.png", PNG_BYTES, "image/png")}).json()
    client.post(
        f"/api/v1/project-items/{item['id']}/files",
        json={"fileId": stored["id"], "kind": "image", "isPrimary": True},
    )
    assert [p for p in settings.files_dir.rglob("*") if p.is_file()]
    assert client.delete(f"/api/v1/project-items/{item['id']}").status_code == 204
    assert [p.name for p in settings.files_dir.rglob("*") if p.is_file()] == []
    assert client.get(f"/api/v1/files/{stored['id']}").status_code == 404


def test_renaming_a_location_never_touches_a_location_with_a_similar_code(
    client: TestClient, world: dict[str, Any]
) -> None:
    pid = world["project"].id
    sdb = client.post(
        f"/api/v1/projects/{pid}/locations", json={"code": "CHA-SDB", "name": "Salle de bain"}
    ).json()
    in_room = _lamp(client, world, world["cha"])
    in_bath = client.post(
        base(world),
        json={
            "name": "Lampe",
            "categoryId": world["lud"].id,
            "placements": [{"locationId": sdb["id"]}],
        },
    ).json()
    assert in_bath["itemCode"] == "CHA-SDB-LUD-01"
    client.patch(f"/api/v1/locations/{world['cha'].id}", json={"code": "CHB"})
    assert client.get(f"/api/v1/project-items/{in_room['id']}").json()["itemCode"] == "CHB-LUD-01"
    assert (
        client.get(f"/api/v1/project-items/{in_bath['id']}").json()["itemCode"] == "CHA-SDB-LUD-01"
    )


def test_a_new_option_stays_deletable_after_its_base_changed(
    client: TestClient, world: dict[str, Any]
) -> None:
    lamp = _lamp(client, world, world["cha"])
    client.post(f"/api/v1/projects/{world['project'].id}/indice")
    option = _lamp(client, world, optionOfId=lamp["id"])
    client.post(f"/api/v1/project-items/{lamp['id']}/placements", json={"locationId": None})
    assert client.delete(f"/api/v1/project-items/{option['id']}").status_code == 204
