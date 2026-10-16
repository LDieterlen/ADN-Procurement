"""`/settings` : lecture, PATCH partiel, 422 champ par champ, préfixe hérité par les projets."""

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import PDF_BYTES, PNG_BYTES, make_client, make_project
from ffe.config import Settings
from ffe.deps import Clock
from ffe.exports.pdf import render_html
from ffe.exports.prescription import sheets_context
from ffe.models import File


def test_settings_are_read_with_their_defaults(client: TestClient) -> None:
    body = client.get("/api/v1/settings").json()
    assert body["id"] == 1 and body["baseCurrency"] == "EUR" and body["projectCodePrefix"] == ""
    assert body["agencyName"] == "" and body["agencyAddress"] is None


def test_partial_patch_keeps_the_other_fields(client: TestClient) -> None:
    first = client.patch(
        "/api/v1/settings", json={"agencyName": "  Atelier X ", "agencyPhone": "01 02 03 04 05"}
    )
    assert first.status_code == 200, first.text
    assert first.json()["agencyName"] == "Atelier X"
    second = client.patch("/api/v1/settings", json={"projectCodePrefix": "p"})
    assert second.json()["projectCodePrefix"] == "P"
    assert second.json()["agencyPhone"] == "01 02 03 04 05"  # untouched
    assert second.json()["updatedAt"] == "2026-10-09T12:00:00Z"


def test_each_invalid_field_is_named(client: TestClient) -> None:
    bad = client.patch(
        "/api/v1/settings",
        json={"projectCodePrefix": "é", "agencyEmail": "nope", "agencyName": None},
    )
    assert bad.status_code == 422
    fields = sorted(d["field"] for d in bad.json()["details"])
    assert fields == ["agencyEmail", "agencyName", "projectCodePrefix"]


def test_empty_optional_texts_become_null(client: TestClient) -> None:
    body = client.patch("/api/v1/settings", json={"agencyAddress": "   ", "agencyPhone": ""}).json()
    assert body["agencyAddress"] is None and body["agencyPhone"] is None


def test_new_projects_use_the_patched_prefix(
    client: TestClient, session: Session, clock: Clock
) -> None:
    client.patch("/api/v1/settings", json={"projectCodePrefix": "P"})
    owner = make_client(session, clock)
    project = client.post("/api/v1/projects", json={"name": "Villa", "clientId": owner.id}).json()
    assert project["code"].startswith("P2026-")


def test_the_agency_logo_and_name_sign_the_sheets(
    client: TestClient, session: Session, clock: Clock, settings: Settings
) -> None:
    """2026-10-16: the logo uploaded in the settings at the top left of the sheets, « Réalisé par »
    and the agency name at the bottom left; a replaced logo leaves the disk; never a PDF."""

    def upload(name: str, data: bytes, mime: str) -> int:
        return int(client.post("/api/v1/files", files={"file": (name, data, mime)}).json()["id"])

    logo = upload("logo.png", PNG_BYTES, "image/png")
    body = client.patch(
        "/api/v1/settings", json={"agencyName": "Atelier & Co", "agencyLogoFileId": logo}
    )
    assert body.status_code == 200, body.text
    assert body.json()["agencyLogoFileId"] == logo
    refused = client.patch(
        "/api/v1/settings", json={"agencyLogoFileId": upload("a.pdf", PDF_BYTES, "application/pdf")}
    )
    assert refused.status_code == 422
    assert refused.json()["details"][0]["field"] == "agencyLogoFileId"
    project = make_project(session, clock)
    context = sheets_context(session, project.id, date(2026, 10, 16), files_dir=settings.files_dir)
    html = render_html("sheets.html", context)
    stored = session.get(File, logo)
    assert stored is not None
    assert f'<img src="{stored.filename}" alt="Atelier &amp; Co">' in html
    assert 'content: "Réalisé par Atelier & Co"' in html  # a CSS string: « & » as is
    # Advanced options of « Fiches PDF »: name, studio mark, logo left off on demand.
    bare = render_html(
        "sheets.html",
        sheets_context(
            session,
            project.id,
            date(2026, 10, 16),
            files_dir=settings.files_dir,
            hide_agency_name=True,
            hide_studio=True,
            hide_agency_logo=True,
        ),
    )
    assert 'content: ""' in bare  # no name at the bottom left
    assert stored.filename not in bare
    assert "racoon-footer" not in bare
    assert "racoon-footer" in html
    issued = client.post(
        f"/api/v1/projects/{project.id}/exports/sheets",
        json={"hideAgencyName": True, "hideStudio": True, "hideAgencyLogo": True},
    )
    assert issued.status_code == 200, issued.text
    other = upload("autre.png", PNG_BYTES + b"x", "image/png")
    client.patch("/api/v1/settings", json={"agencyLogoFileId": other})
    assert client.get(f"/api/v1/files/{logo}/content").status_code == 404  # replaced: gone
    removed = client.patch("/api/v1/settings", json={"agencyLogoFileId": None}).json()
    assert removed["agencyLogoFileId"] is None
