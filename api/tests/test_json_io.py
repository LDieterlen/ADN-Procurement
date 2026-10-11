"""Export / import JSON: shape, round trip, refusals (ARCHITECTURE §5)."""

from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import Engine, insert, text

from ffe.db import DbError
from ffe.db.engine import create_db_engine
from ffe.db.json_io import export_json, import_json
from ffe.db.migrate import upgrade_head
from ffe.deps import Clock
from ffe.models import Client

NOW = "2026-10-09T12:00:00Z"


def seed(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("UPDATE setting SET default_vat_bp = 1000 WHERE id = 1"))
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
    assert document["schemaRevision"] == "0006"
    assert list(document["tables"]) == [
        "setting",
        "client",
        "category",
        "manufacturer",
        "supplier",
        "file",
        "product",
        "product_file",
        "project",
        "zone",
        "project_item",
        "project_item_placement",
        "project_item_event",
        "code_sequence",
        "project_item_file",
        "budget_line",
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
            "manufacturer": 0,
            "supplier": 0,
            "file": 0,
            "product": 0,
            "product_file": 0,
            "project": 0,
            "zone": 0,
            "project_item": 0,
            "project_item_placement": 0,
            "project_item_event": 0,
            "code_sequence": 0,
            "project_item_file": 0,
            "budget_line": 0,
        }
        assert export_json(fresh, clock) == document
    finally:
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
        ({"tables": {"setting": [], "client": [], "quote": []}}, "Tables inconnues"),
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
