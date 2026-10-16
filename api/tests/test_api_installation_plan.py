"""Floor plans (ADR-0024): an image drawn as it is or upright and on white, a PDF drawn from its
first page, white margins cut off."""

from io import BytesIO
from typing import Any

from fastapi.testclient import TestClient
from PIL import Image

from installation_helpers import API, installation_world, make_pdf, make_png, upload_file  # noqa: F401  (fixture)


def test_an_image_plan_is_drawn_as_it_is(client: TestClient, world: dict[str, Any]) -> None:
    project_id = world["project"].id
    png = upload_file(client, "rdc.png", make_png(), "image/png")
    created = client.post(
        f"{API}/projects/{project_id}/installation-plans", json={"fileId": png["id"]}
    )
    assert created.status_code == 201, created.text
    plan = created.json()
    assert plan["name"] == "rdc" and plan["fileId"] == png["id"] and plan["sourceFileId"] is None
    renamed = client.patch(f"{API}/installation-plans/{plan['id']}", json={"name": "RDC"}).json()
    assert renamed["name"] == "RDC"
    listed = client.get(f"{API}/projects/{project_id}/installation-plans").json()
    assert [p["name"] for p in listed] == ["RDC"]


def test_a_pdf_plan_is_drawn_from_its_first_page(client: TestClient, world: dict[str, Any]) -> None:
    pdf = upload_file(client, "salon.pdf", make_pdf(), "application/pdf")
    plan = client.post(
        f"{API}/projects/{world['project'].id}/installation-plans",
        json={"fileId": pdf["id"], "name": "Salon"},
    ).json()
    assert plan["sourceFileId"] == pdf["id"] and plan["fileId"] != pdf["id"]
    drawn = client.get(f"{API}/files/{plan['fileId']}/content")
    assert drawn.headers["content-type"] == "image/png"
    assert Image.open(BytesIO(drawn.content)).width > 100  # rendered, then its margins cut off


def test_white_margins_are_cut_off_and_a_plan_without_them_is_kept(
    client: TestClient, world: dict[str, Any]
) -> None:
    url = f"{API}/projects/{world['project'].id}/installation-plans"
    sheet = Image.new("RGB", (1000, 800), (255, 255, 255))
    sheet.paste((30, 30, 30), (400, 300, 600, 500))  # the room, small in the middle
    buffer = BytesIO()
    sheet.save(buffer, "PNG")
    wide = upload_file(client, "marges.png", buffer.getvalue(), "image/png")
    plan = client.post(url, json={"fileId": wide["id"]}).json()
    assert plan["fileId"] != wide["id"] and plan["sourceFileId"] == wide["id"]
    drawn = Image.open(BytesIO(client.get(f"{API}/files/{plan['fileId']}/content").content))
    assert drawn.size == (200 + 2 * 10, 200 + 2 * 10)  # the room and a thin border
    full = upload_file(client, "plein.png", make_png(), "image/png")  # drawn to the edges
    kept = client.post(url, json={"fileId": full["id"]}).json()
    assert kept["fileId"] == full["id"] and kept["sourceFileId"] is None
    pdf = upload_file(client, "salon.pdf", make_pdf(), "application/pdf")
    from_pdf = client.post(url, json={"fileId": pdf["id"]}).json()
    page = Image.open(BytesIO(client.get(f"{API}/files/{from_pdf['fileId']}/content").content))
    assert page.width < 1000  # a short text on an A4 page: the blank page cut away


def test_a_turned_photo_and_a_transparent_plan_are_stored_upright_and_on_white(
    client: TestClient, world: dict[str, Any]
) -> None:
    url = f"{API}/projects/{world['project'].id}/installation-plans"
    photo = Image.new("RGB", (400, 300), (40, 40, 40))  # drawn to the edges: nothing to cut
    exif = photo.getexif()
    exif[0x0112] = 6  # shown turned a quarter: 300 × 400
    buffer = BytesIO()
    photo.save(buffer, "JPEG", exif=exif.tobytes())
    stored = upload_file(client, "photo.jpg", buffer.getvalue(), "image/jpeg")
    plan = client.post(url, json={"fileId": stored["id"]}).json()
    drawn = Image.open(BytesIO(client.get(f"{API}/files/{plan['fileId']}/content").content))
    assert drawn.size == (300, 400) and plan["sourceFileId"] == stored["id"]
    clear = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    clear.paste((20, 20, 20, 255), (100, 100, 200, 200))
    buffer = BytesIO()
    clear.save(buffer, "PNG")
    transparent = upload_file(client, "fond.png", buffer.getvalue(), "image/png")
    flat = client.post(url, json={"fileId": transparent["id"]}).json()
    image = Image.open(BytesIO(client.get(f"{API}/files/{flat['fileId']}/content").content))
    assert image.mode == "RGB" and image.getpixel((0, 0)) == (255, 255, 255)  # white, then cut
    assert image.size == (100 + 2 * 8, 100 + 2 * 8)


def test_an_unreadable_pdf_is_refused_on_the_file_field(
    client: TestClient, world: dict[str, Any]
) -> None:
    broken = upload_file(client, "x.pdf", b"%PDF-1.4\n" + b"%" * 64, "application/pdf")
    refused = client.post(
        f"{API}/projects/{world['project'].id}/installation-plans", json={"fileId": broken["id"]}
    )
    assert refused.status_code == 422 and refused.json()["details"][0]["field"] == "fileId"
