"""Export / import JSON: shape, round trip, refusals (ARCHITECTURE §5)."""

from io import BytesIO
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import Engine, insert, text
from sqlalchemy.orm import Session

from conftest import make_item, make_project
from ffe.db import DbError
from ffe.db.engine import create_db_engine
from ffe.db.json_io import export_json, import_json
from ffe.db.migrate import upgrade_head
from ffe.deps import Clock
from ffe.models import Client
from ffe.schemas.project_item import OptionAttach
from ffe.services.project_item import attach_option

NOW = "2026-10-09T12:00:00Z"


def seed(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("UPDATE setting SET project_code_prefix = 'P' WHERE id = 1"))
        conn.execute(
            insert(Client).values(
                name="Famille Martin",
                siren="123456789",
                city="Paris",
                created_at=NOW,
                updated_at=NOW,
            )
        )
        conn.execute(
            insert(Client).values(name="Hôtel X", kind="company", created_at=NOW, updated_at=NOW)
        )


def test_export_has_the_documented_shape(engine: Engine, clock: Clock) -> None:
    seed(engine)
    document = export_json(engine, clock)
    assert document["format"] == "ffe-export" and document["version"] == 1
    assert document["exportedAt"] == "2026-10-09T12:00:00Z"
    assert document["schemaRevision"] == "0009"
    assert list(document["tables"]) == [
        "setting",
        "client",
        "category",
        "choice",
        "listing_profile",
        "professional",
        "supplier",
        "file",
        "capture",
        "capture_image",
        "project",
        "project_diffusion",
        "project_indice",
        "location",
        "project_item",
        "project_item_placement",
        "project_item_event",
        "item_code_sequence",
        "project_item_file",
        "installation_plan",
        "installation_sheet",
        "installation_sheet_item",
        "installation_sheet_marker",
        "budget_line",
        "project_file",
    ]
    first = document["tables"]["client"][0]
    assert first["name"] == "Famille Martin" and first["countryCode"] == "FR"
    assert "created_at" not in first and "createdAt" in first  # camelCase only


def test_round_trip_into_a_fresh_database(engine: Engine, clock: Clock, ext4_tmp: Path) -> None:
    seed(engine)
    document = export_json(engine, clock)
    fresh = create_db_engine(ext4_tmp / "fresh.sqlite")
    try:
        upgrade_head(fresh)
        imported = import_json(fresh, document)
        assert imported == {
            "setting": 1,
            "client": 2,
            "category": 0,
            "choice": 13,
            "listing_profile": 5,
            "professional": 0,
            "supplier": 0,
            "file": 0,
            "capture": 0,
            "capture_image": 0,
            "project": 0,
            "project_diffusion": 0,
            "project_indice": 0,
            "location": 0,
            "project_item": 0,
            "project_item_placement": 0,
            "project_item_event": 0,
            "item_code_sequence": 0,
            "project_item_file": 0,
            "installation_plan": 0,
            "installation_sheet": 0,
            "installation_sheet_item": 0,
            "installation_sheet_marker": 0,
            "budget_line": 0,
            "project_file": 0,
        }
        assert export_json(fresh, clock) == document
    finally:
        fresh.dispose()


def test_round_trip_keeps_an_option_pointing_to_a_newer_base(
    engine: Engine, session: Session, clock: Clock, ext4_tmp: Path
) -> None:
    """ADR-0021: an older article attached as an option of a newer one (option_of_id > id)."""
    project = make_project(session, clock)
    older = make_item(session, clock, project.id)
    newer = make_item(session, clock, project.id, category_id=older.category_id)
    option = attach_option(session, newer.id, OptionAttach(project_item_id=older.id), clock)
    assert option.option_of_id == newer.id > older.id
    document = export_json(engine, clock)
    fresh = create_db_engine(ext4_tmp / "fresh-option.sqlite")
    upgrade_head(fresh)
    imported = import_json(fresh, document)
    assert imported["project_item"] == 2
    fresh.dispose()


def test_import_refuses_a_non_empty_table_without_replace(engine: Engine, clock: Clock) -> None:
    seed(engine)
    document = export_json(engine, clock)
    with pytest.raises(DbError, match="--replace"):
        import_json(engine, document)


def test_import_with_replace_overwrites_everything(engine: Engine, clock: Clock) -> None:
    seed(engine)
    document = export_json(engine, clock)
    with engine.begin() as conn:
        conn.execute(insert(Client).values(name="Intrus", created_at=NOW, updated_at=NOW))
    import_json(engine, document, replace=True)
    assert export_json(engine, clock) == document


@pytest.mark.parametrize(
    ("patch", "message"),
    [
        ({"schemaRevision": "9999"}, "inconnue"),
        ({"format": "autre"}, "Format attendu"),
        ({"tables": {"setting": [], "client": [], "invoice": []}}, "Tables inconnues"),
        (
            {"tables": {"setting": [], "client": [{"name": "x", "colour": "bleu"}]}},
            "Colonnes inconnues",
        ),
    ],
)
def test_import_refuses_bad_documents(
    engine: Engine, clock: Clock, patch: dict[str, Any], message: str
) -> None:
    document = export_json(engine, clock)
    document.update(patch)
    with pytest.raises(DbError, match=message):
        import_json(engine, document)


def test_import_validates_each_row_with_the_read_schema(engine: Engine, clock: Clock) -> None:
    document = export_json(engine, clock)
    document["tables"]["client"] = [{"id": 1, "name": "x", "createdAt": NOW}]  # fields missing
    with pytest.raises(DbError, match=r"client\[0\]"):
        import_json(engine, document)


def test_import_lets_the_database_enforce_its_constraints(engine: Engine, clock: Clock) -> None:
    seed(engine)
    document = export_json(engine, clock)
    document["tables"]["client"][0]["name"] = ""  # complete row, passes the schema, fails the CHECK
    with pytest.raises(Exception, match="ck_client_name_not_empty|CHECK"):
        import_json(engine, document, replace=True)


def test_export_files_copies_the_attachments_next_to_the_document(ext4_tmp: Path) -> None:
    from ffe.db.json_io import export_files

    files_dir = ext4_tmp / "files"
    files_dir.mkdir()
    (files_dir / ("e" * 64 + ".png")).write_bytes(b"E")
    assert export_files(files_dir, ext4_tmp / "out" / "files") == 1
    assert (ext4_tmp / "out" / "files" / ("e" * 64 + ".png")).read_bytes() == b"E"


def test_a_settings_logo_survives_the_round_trip_and_a_replace(
    client: TestClient, engine: Engine, clock: Clock, ext4_tmp: Path
) -> None:
    """The settings row comes first but points at a file (the agency logo, migration 0006)."""
    buffer = BytesIO()
    Image.new("RGB", (20, 20), (9, 9, 9)).save(buffer, "PNG")
    logo = client.post(
        "/api/v1/files", files={"file": ("logo.png", buffer.getvalue(), "image/png")}
    ).json()
    assert (
        client.patch("/api/v1/settings", json={"agencyLogoFileId": logo["id"]}).status_code == 200
    )
    document = export_json(engine, clock)
    fresh = create_db_engine(ext4_tmp / "fresh.sqlite")
    try:
        upgrade_head(fresh)
        import_json(fresh, document)
        import_json(fresh, document, replace=True)  # emptied first, logo included
        assert export_json(fresh, clock)["tables"]["setting"][0]["agencyLogoFileId"] == logo["id"]
    finally:
        fresh.dispose()


def test_an_export_of_an_older_revision_lacking_the_new_columns_imports(
    session: Session, engine: Engine, clock: Clock, ext4_tmp: Path
) -> None:
    """The real base exports at its own revision (v1 and later): columns added since are absent."""
    project = make_project(session, clock)
    make_item(session, clock, project.id)
    document = export_json(engine, clock)
    document["schemaRevision"] = "0003"
    for row in document["tables"]["project"]:
        del row["procurementName"], row["procurementLogoFileId"]
    for row in document["tables"]["project_item_placement"]:
        del row["indice"], row["diffusedItemId"]
    for row in document["tables"]["setting"]:
        del row["agencyLogoFileId"]
    fresh = create_db_engine(ext4_tmp / "fresh.sqlite")
    try:
        upgrade_head(fresh)
        imported = import_json(fresh, document)
        assert imported["project"] == 1 and imported["project_item_placement"] == 1
    finally:
        fresh.dispose()
