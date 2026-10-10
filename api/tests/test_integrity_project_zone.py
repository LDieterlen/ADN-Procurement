"""Migration 0004 schema: project and zone CHECKs, UNIQUE constraints, FK RESTRICT."""

from typing import Any

import pytest
from sqlalchemy import Engine, insert, text
from sqlalchemy.exc import IntegrityError

from ffe.models import Client, Project, Zone

NOW = "2026-10-09T12:00:00Z"


def insert_row(engine: Engine, model: Any, **values: Any) -> None:
    values.setdefault("created_at", NOW)
    values.setdefault("updated_at", NOW)
    with engine.begin() as conn:
        conn.execute(insert(model).values(**values))


@pytest.fixture
def seeded(engine: Engine) -> Engine:
    insert_row(engine, Client, name="Hôtel X SA")
    insert_row(
        engine, Project, code="2026-001", name="Rénovation", client_id=1, default_vat_bp=2000
    )
    insert_row(engine, Zone, project_id=1, code="CHA", name="Chambre A", multiplier=12)
    return engine


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"code": "", "name": "A", "client_id": 1, "default_vat_bp": 2000}, "code_not_empty"),
        (
            {"code": "X", "name": "A", "client_id": 1, "default_vat_bp": 2000, "status": "open"},
            "status_enum",
        ),
        (
            {"code": "X", "name": "A", "client_id": 1, "default_vat_bp": 10001},
            "default_vat_bp_range",
        ),
        (
            {"code": "X", "name": "A", "client_id": 1, "default_vat_bp": 0, "due_on": "01/01/2027"},
            "due_on_date",
        ),
        (
            {
                "code": "X",
                "name": "A",
                "client_id": 1,
                "default_vat_bp": 0,
                "start_on": "2027-01-01",
                "due_on": "2026-01-01",
            },
            "due_after_start",
        ),
        ({"code": "2026-001", "name": "A", "client_id": 1, "default_vat_bp": 0}, "project.code"),
        ({"code": "X", "name": "A", "client_id": 99, "default_vat_bp": 0}, "FOREIGN KEY"),
    ],
)
def test_project_constraints(seeded: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(seeded, Project, **values)


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"project_id": 1, "code": "", "name": "A"}, "code_not_empty"),
        ({"project_id": 1, "code": "LOB", "name": "A", "multiplier": 0}, "multiplier_min"),
        ({"project_id": 1, "code": "CHA", "name": "Doublon"}, "zone.project_id, zone.code"),
        ({"project_id": 9, "code": "LOB", "name": "A"}, "FOREIGN KEY"),
    ],
)
def test_zone_constraints(seeded: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(seeded, Zone, **values)


def test_client_and_project_are_restricted_on_delete(seeded: Engine) -> None:
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), seeded.begin() as conn:
        conn.execute(text("DELETE FROM client WHERE id = 1"))
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), seeded.begin() as conn:
        conn.execute(text("DELETE FROM project WHERE id = 1"))


def test_zone_id_project_id_unique_exists_for_composite_fks(seeded: Engine) -> None:
    with seeded.connect() as conn:
        sql = conn.exec_driver_sql("SELECT sql FROM sqlite_master WHERE name = 'zone'").scalar_one()
    assert "CONSTRAINT uq_zone_id UNIQUE (id, project_id)" in str(sql)
