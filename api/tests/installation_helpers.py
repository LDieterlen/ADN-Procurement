"""Shared by the installation tests (ADR-0024): tiny real images and PDFs, a project with a
living room of 13 armchairs and an office chair, and the request shapes."""

from collections.abc import Sequence
from io import BytesIO
from typing import Any

import pypdfium2 as pdfium  # pyright: ignore[reportMissingTypeStubs]
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session
from weasyprint import HTML  # pyright: ignore[reportMissingTypeStubs]

from conftest import make_category, make_location, make_project
from ffe.deps import Clock

API = "/api/v1"


def make_png() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (40, 30), (200, 190, 180)).save(buffer, "PNG")
    return buffer.getvalue()


def make_pdf() -> bytes:
    data: bytes | None = HTML(string="<p>Plan du salon</p>").write_pdf()  # pyright: ignore[reportUnknownMemberType]
    assert data is not None
    return data


def pdf_pages(data: bytes) -> int:
    document = pdfium.PdfDocument(data)
    try:
        return len(document)
    finally:
        document.close()


def upload_file(client: TestClient, name: str, data: bytes, mime: str) -> dict[str, Any]:
    return client.post(f"{API}/files", files={"file": (name, data, mime)}).json()


@pytest.fixture(name="world")
def installation_world(client: TestClient, session: Session, clock: Clock) -> dict[str, Any]:
    project = make_project(session, clock, name="Villa", code="VIL")
    salon = make_location(session, clock, project.id, code="SAL", name="Salon", multiplier=1)
    bureau = make_location(session, clock, project.id, code="BUR", name="Bureau", multiplier=1)
    cat = make_category(session, clock, name="Assise", code="ASS")
    base = f"{API}/projects/{project.id}/project-items"

    def item(name: str, location_id: int) -> dict[str, Any]:
        body = {"name": name, "categoryId": cat.id, "placements": [{"locationId": location_id}]}
        created = client.post(base, json=body)
        assert created.status_code == 201, created.text
        return created.json()

    salon_items = [item(f"Fauteuil {n}", salon.id) for n in range(13)]
    desk = item("Chaise de bureau", bureau.id)
    return {
        "project": project,
        "salon": salon,
        "bureau": bureau,
        "items": salon_items,
        "desk": desk,
    }


def as_cells(placement_ids: Sequence[int | None]) -> list[dict[str, Any] | None]:
    return [{"placementId": p} if p is not None else None for p in placement_ids]


def placement_of(item: dict[str, Any]) -> int:
    return item["placements"][0]["id"]
