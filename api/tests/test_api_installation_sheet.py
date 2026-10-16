"""Installation sheets (ADR-0024): the room's articles in their cells, empty cells, dots on the
plan, colours by type, arrangements, and their A3 PDF."""

from typing import Any

import pypdfium2 as pdfium  # pyright: ignore[reportMissingTypeStubs]
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import make_category
from ffe.deps import Clock
from ffe.installation import ARRANGEMENTS, TYPE_COLORS
from installation_helpers import (  # noqa: F401  (installation_world: the « world » fixture)
    API,
    as_cells,
    installation_world,
    make_pdf,
    make_png,
    pdf_pages,
    placement_of,
    upload_file,
)


def test_a_sheet_orders_the_room_articles_and_points_out_the_unplaced(
    client: TestClient, world: dict[str, Any]
) -> None:
    project_id, salon = world["project"].id, world["salon"]
    created = client.post(
        f"{API}/projects/{project_id}/installation-sheets",
        json={"locationId": salon.id, "name": " Coin TV "},
    )
    assert created.status_code == 201, created.text
    sheet = created.json()
    assert sheet["name"] == "Coin TV" and sheet["perPage"] == 12 and sheet["pageCount"] == 1
    assert sheet["arrangement"] == "ring" and sheet["planRotation"] == 0
    grids = {(g["arrangement"], g["perPage"]): g for g in sheet["layouts"]}
    assert len(grids) == 12 and len(grids[("ring", 12)]["slots"]) == 12
    assert grids[("ring", 12)]["plan"] == {"row": 1, "col": 1, "rows": 2, "cols": 2}
    assert len(sheet["candidates"]) == 13  # the room only: the desk chair is elsewhere
    first, second = world["items"][0], world["items"][1]
    order = [placement_of(second), placement_of(first)]
    saved = client.put(
        f"{API}/installation-sheets/{sheet['id']}/items", json={"cells": as_cells(order)}
    ).json()
    assert [a["placementId"] for a in saved["items"]] == order
    assert saved["items"][0]["code"] == second["placements"][0]["code"]
    assert len(saved["candidates"]) == 11
    other = client.post(
        f"{API}/projects/{project_id}/installation-sheets",
        json={"locationId": salon.id, "name": "Cheminée", "perPage": 8},
    ).json()
    reread = client.put(
        f"{API}/installation-sheets/{other['id']}/items",
        json={"cells": as_cells([placement_of(first)])},
    ).json()
    assert reread["items"][0]["otherSheets"] == ["Coin TV"]  # on several sheets: allowed, said
    candidates = {c["placementId"]: c for c in reread["candidates"]}
    assert candidates[placement_of(second)]["otherSheets"] == ["Coin TV"]
    assert candidates[placement_of(world["items"][2])]["otherSheets"] == []  # on no sheet yet
    listed = client.get(f"{API}/projects/{project_id}/installation-sheets").json()
    assert [(s["name"], s["itemCount"]) for s in listed] == [("Coin TV", 2), ("Cheminée", 1)]


def test_a_sheet_refuses_repeats_and_articles_of_another_room(
    client: TestClient, world: dict[str, Any]
) -> None:
    sheet = client.post(
        f"{API}/projects/{world['project'].id}/installation-sheets",
        json={"locationId": world["salon"].id, "name": "Entrée"},
    ).json()
    url = f"{API}/installation-sheets/{sheet['id']}/items"
    one = placement_of(world["items"][0])
    repeated = client.put(url, json={"cells": as_cells([one, one])})
    assert repeated.status_code == 422 and repeated.json()["details"][0]["field"] == "cells"
    elsewhere = client.put(url, json={"cells": as_cells([placement_of(world["desk"])])})
    assert elsewhere.status_code == 422
    assert world["desk"]["placements"][0]["code"] in elsewhere.json()["details"][0]["message"]


def test_each_invalid_sheet_field_is_named_and_unknown_ids_are_404(
    client: TestClient, world: dict[str, Any]
) -> None:
    url = f"{API}/projects/{world['project'].id}/installation-sheets"
    bad = client.post(
        url,
        json={
            "locationId": world["salon"].id,
            "name": "",
            "perPage": 10,
            "arrangement": "left",
            "planRotation": 45,
        },
    )
    assert bad.status_code == 422
    fields = sorted(d["field"] for d in bad.json()["details"])
    assert fields == ["arrangement", "name", "perPage", "planRotation"]
    foreign = client.post(url, json={"locationId": 9999, "name": "X"})
    assert foreign.status_code == 422 and foreign.json()["details"][0]["field"] == "locationId"
    assert client.get(f"{API}/installation-sheets/9999").status_code == 404
    assert client.patch(f"{API}/installation-plans/9999", json={"name": "x"}).status_code == 404


def test_patch_is_partial_and_a_used_plan_is_kept(
    client: TestClient, world: dict[str, Any]
) -> None:
    project_id = world["project"].id
    png = upload_file(client, "rdc.png", make_png(), "image/png")
    plan = client.post(
        f"{API}/projects/{project_id}/installation-plans", json={"fileId": png["id"]}
    ).json()
    sheet = client.post(
        f"{API}/projects/{project_id}/installation-sheets",
        json={"locationId": world["salon"].id, "name": "Coin TV", "planId": plan["id"]},
    ).json()
    patched = client.patch(
        f"{API}/installation-sheets/{sheet['id']}",
        json={"perPage": 16, "arrangement": "right", "planRotation": 90},
    ).json()
    assert patched["arrangement"] == "right" and patched["planRotation"] == 90
    assert (
        patched["perPage"] == 16
        and patched["name"] == "Coin TV"
        and patched["planId"] == plan["id"]
    )
    assert client.delete(f"{API}/installation-plans/{plan['id']}").status_code == 409
    cleared = client.patch(f"{API}/installation-sheets/{sheet['id']}", json={"planId": None}).json()
    assert cleared["planId"] is None
    assert client.delete(f"{API}/installation-plans/{plan['id']}").status_code == 204
    assert client.get(f"{API}/files/{png['id']}/content").status_code == 404  # bytes gone
    assert client.delete(f"{API}/installation-sheets/{sheet['id']}").status_code == 204
    assert client.get(f"{API}/installation-sheets/{sheet['id']}").status_code == 404


def test_the_pdf_has_one_a3_page_per_slice_of_articles(
    client: TestClient, world: dict[str, Any]
) -> None:
    project_id = world["project"].id
    pdf = upload_file(client, "salon.pdf", make_pdf(), "application/pdf")
    plan = client.post(
        f"{API}/projects/{project_id}/installation-plans", json={"fileId": pdf["id"]}
    ).json()
    sheet = client.post(
        f"{API}/projects/{project_id}/installation-sheets",
        json={"locationId": world["salon"].id, "name": "Salon", "planId": plan["id"]},
    ).json()
    client.put(
        f"{API}/installation-sheets/{sheet['id']}/items",
        json={"cells": as_cells([placement_of(i) for i in world["items"]])},
    )
    one = client.get(f"{API}/installation-sheets/{sheet['id']}/pdf")
    assert one.status_code == 200 and one.headers["content-type"] == "application/pdf"
    assert pdf_pages(one.content) == 2  # 13 articles, 12 per page
    page = pdfium.PdfDocument(one.content)[0]
    width, height = page.get_size()
    assert (round(width), round(height)) == (1191, 842)  # A3 landscape, in points
    client.post(
        f"{API}/projects/{project_id}/installation-sheets",
        json={"locationId": world["bureau"].id, "name": "Bureau"},
    )
    every = client.get(f"{API}/projects/{project_id}/installation.pdf?print=true")
    assert pdf_pages(every.content) == 3  # the empty sheet still prints its plan page
    room = client.get(
        f"{API}/projects/{project_id}/installation.pdf?locationId={world['bureau'].id}"
    )
    assert pdf_pages(room.content) == 1
    elsewhere = client.get(f"{API}/projects/{project_id}/installation.pdf?locationId=9999")
    assert elsewhere.status_code == 404
    exports = client.get(f"{API}/projects/{project_id}/exports").json()
    assert exports == []  # a working document, never stored


def test_a_cancelled_article_leaves_the_candidates_and_a_removed_placement_the_sheet(
    client: TestClient, world: dict[str, Any]
) -> None:
    sheet = client.post(
        f"{API}/projects/{world['project'].id}/installation-sheets",
        json={"locationId": world["salon"].id, "name": "Coin TV"},
    ).json()
    first = world["items"][0]
    client.put(
        f"{API}/installation-sheets/{sheet['id']}/items",
        json={"cells": as_cells([placement_of(first)])},
    )
    cancelled = client.post(
        f"{API}/project-items/{world['items'][1]['id']}/status", json={"status": "cancelled"}
    )
    assert cancelled.status_code == 200, cancelled.text
    detail = client.get(f"{API}/installation-sheets/{sheet['id']}").json()
    assert len(detail["candidates"]) == 11
    refused = client.put(
        f"{API}/installation-sheets/{sheet['id']}/items",
        json={"cells": as_cells([placement_of(world["items"][1])])},
    )
    assert refused.status_code == 422 and "annulé" in refused.json()["details"][0]["message"]
    huge = client.put(
        f"{API}/installation-sheets/{sheet['id']}/items", json={"cells": [None] * 10_000}
    )
    assert huge.status_code == 422
    assert client.delete(f"{API}/project-items/{first['id']}").status_code == 204
    assert client.get(f"{API}/installation-sheets/{sheet['id']}").json()["items"] == []


def test_empty_cells_keep_their_place_and_trailing_ones_are_dropped(
    client: TestClient, world: dict[str, Any]
) -> None:
    sheet = client.post(
        f"{API}/projects/{world['project'].id}/installation-sheets",
        json={"locationId": world["salon"].id, "name": "Coin TV", "perPage": 8},
    ).json()
    a, b = (placement_of(i) for i in world["items"][:2])
    url = f"{API}/installation-sheets/{sheet['id']}/items"
    saved = client.put(url, json={"cells": as_cells([None, a, None, None, b, None, None])}).json()
    assert [cell and cell["placementId"] for cell in saved["items"]] == [None, a, None, None, b]
    assert saved["itemCount"] == 2 and saved["pageCount"] == 1
    later = client.put(url, json={"cells": as_cells([b, *[None] * 8, a])}).json()
    assert later["pageCount"] == 2  # a on the 10th cell: second page of 8
    assert [cell and cell["placementId"] for cell in later["items"]][::9] == [b, a]


def test_every_arrangement_and_a_turned_plan_render(
    client: TestClient, world: dict[str, Any]
) -> None:
    project_id = world["project"].id
    png = upload_file(client, "rdc.png", make_png(), "image/png")
    plan = client.post(
        f"{API}/projects/{project_id}/installation-plans", json={"fileId": png["id"]}
    ).json()
    cells = [placement_of(i) for i in world["items"][:5]]
    for arrangement in ARRANGEMENTS:
        sheet = client.post(
            f"{API}/projects/{project_id}/installation-sheets",
            json={
                "locationId": world["salon"].id,
                "name": arrangement,
                "planId": plan["id"],
                "perPage": 8,
                "arrangement": arrangement,
                "planRotation": 90,
            },
        ).json()
        client.put(
            f"{API}/installation-sheets/{sheet['id']}/items",
            json={"cells": as_cells([cells[0], None, *cells[1:]])},
        )
        pdf = client.get(f"{API}/installation-sheets/{sheet['id']}/pdf")
        assert pdf.status_code == 200 and pdf_pages(pdf.content) == 1, arrangement


def test_markers_follow_their_article_and_types_get_their_colours(
    client: TestClient, session: Session, clock: Clock, world: dict[str, Any]
) -> None:
    project_id = world["project"].id
    lamp_type = make_category(session, clock, name="Lampe", code="LAM", sort_order=999)
    lamp = client.post(
        f"{API}/projects/{project_id}/project-items",
        json={
            "name": "Lampe",
            "categoryId": lamp_type.id,
            "placements": [{"locationId": world["salon"].id}],
        },
    ).json()
    sheet = client.post(
        f"{API}/projects/{project_id}/installation-sheets",
        json={"locationId": world["salon"].id, "name": "Coin TV", "colorByType": True},
    ).json()
    assert sheet["colorByType"] is True
    chair, lamp_id = placement_of(world["items"][0]), placement_of(lamp)
    url = f"{API}/installation-sheets/{sheet['id']}/items"
    two_dots = [{"x": 100, "y": 200}, {"x": 900, "y": 50}]
    saved = client.put(
        url,
        json={"cells": [{"placementId": chair, "markers": two_dots}, {"placementId": lamp_id}]},
    ).json()
    assert saved["items"][0]["markers"] == two_dots and saved["items"][1]["markers"] == []
    colors = {cell["placementId"]: cell["color"] for cell in saved["items"]}
    assert colors[chair] == TYPE_COLORS[0] and colors[lamp_id] == TYPE_COLORS[1]
    moved = client.put(
        url,
        json={"cells": [{"placementId": lamp_id}, {"placementId": chair, "markers": two_dots[:1]}]},
    ).json()
    assert moved["items"][1]["markers"] == two_dots[:1]  # kept row, its dots replaced
    out = client.put(
        url, json={"cells": [{"placementId": chair, "markers": [{"x": 1001, "y": 0}]}]}
    )
    assert out.status_code == 422 and out.json()["details"][0]["field"].startswith("cells")
    pdf = client.get(f"{API}/installation-sheets/{sheet['id']}/pdf")
    assert pdf.status_code == 200 and pdf_pages(pdf.content) == 1
