"""Schema v0: project, location, article and budget CHECKs, UNIQUE constraints, FK rules."""

from typing import Any

import pytest
from sqlalchemy import Engine, insert, text
from sqlalchemy.exc import IntegrityError

from ffe.models import BudgetLine, Category, Client, Location, Project, ProjectItem, Supplier

NOW = "2026-10-09T12:00:00Z"


def insert_row(engine: Engine, model: Any, **values: Any) -> None:
    values.setdefault("created_at", NOW)
    values.setdefault("updated_at", NOW)
    with engine.begin() as conn:
        conn.execute(insert(model).values(**values))


@pytest.fixture
def seeded(engine: Engine) -> Engine:
    insert_row(engine, Client, name="Hôtel X SA")
    insert_row(engine, Category, code="LUD", name="Luminaire décoratif")
    insert_row(engine, Supplier, name="Silvera")
    insert_row(engine, Project, code="2026-001", name="Rénovation", client_id=1)
    insert_row(
        engine,
        Location,
        project_id=1,
        code="CHA",
        name="Chambre A",
        zone="Hébergement",
        multiplier=12,
    )
    return engine


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"code": "", "name": "A", "client_id": 1}, "code_not_empty"),
        ({"code": "X", "name": "A", "client_id": 1, "status": "open"}, "status_enum"),
        ({"code": "X", "name": "A", "client_id": 1, "due_on": "01/01/2027"}, "due_on_date"),
        ({"code": "2026-001", "name": "A", "client_id": 1}, "project.code"),
        ({"code": "X", "name": "A", "client_id": 99}, "FOREIGN KEY"),
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
        ({"project_id": 1, "code": "CHA", "name": "Doublon"}, "location.project_id, location.code"),
        ({"project_id": 9, "code": "LOB", "name": "A"}, "FOREIGN KEY"),
    ],
)
def test_location_constraints(seeded: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(seeded, Location, **values)


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"item_code": "", "name": "A", "category_id": 1}, "item_code_not_empty"),
        ({"item_code": "X", "name": "A", "category_id": 1, "status": "draft"}, "status_enum"),
        ({"item_code": "X", "name": "A", "category_id": 1, "family": "other"}, "family_enum"),
        ({"item_code": "X", "name": "A", "category_id": 1, "usage": "garden"}, "usage_enum"),
        (
            {"item_code": "X", "name": "A", "category_id": 1, "discount_bp": 10001},
            "discount_bp_range",
        ),
        (
            {"item_code": "X", "name": "A", "category_id": 1, "fx_rate_micro": 2},
            "eur_rate_is_one",
        ),
        ({"item_code": "X", "name": "A", "category_id": 1, "kind": "fee"}, "fee_has_no_type"),
        ({"item_code": "X", "name": "A", "category_id": None}, "fee_has_no_type"),
        (
            {"item_code": "X", "name": "A", "category_id": 1, "status": "to_quote", "kind": "ose"},
            "kind_enum",
        ),
    ],
)
def test_article_constraints(seeded: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(seeded, ProjectItem, project_id=1, **values)


def test_article_code_unique_per_project(seeded: Engine) -> None:
    insert_row(seeded, ProjectItem, project_id=1, item_code="CHA-LUD-01", name="A", category_id=1)
    with pytest.raises(IntegrityError, match="project_item.project_id, project_item.item_code"):
        insert_row(
            seeded, ProjectItem, project_id=1, item_code="CHA-LUD-01", name="B", category_id=1
        )


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"scope": "global", "amount_cents": -1}, "amount_min"),
        ({"scope": "room", "amount_cents": 1}, "scope_enum"),
        ({"scope": "location", "amount_cents": 1}, "scope_location"),
        ({"scope": "zone", "amount_cents": 1}, "scope_zone"),
        ({"scope": "global", "zone": "Hébergement", "amount_cents": 1}, "scope_zone"),
        ({"scope": "supplier", "supplier_id": 9, "amount_cents": 1}, "FOREIGN KEY"),
    ],
)
def test_budget_line_constraints(seeded: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(seeded, BudgetLine, project_id=1, **values)


def test_budget_scope_is_unique_per_reference(seeded: Engine) -> None:
    insert_row(seeded, BudgetLine, project_id=1, scope="zone", zone="Hébergement", amount_cents=1)
    with pytest.raises(IntegrityError, match="uq_budget_line_scope"):
        insert_row(
            seeded, BudgetLine, project_id=1, scope="zone", zone="Hébergement", amount_cents=2
        )
    insert_row(seeded, BudgetLine, project_id=1, scope="global", amount_cents=1)
    with pytest.raises(IntegrityError, match="uq_budget_line_scope"):
        insert_row(seeded, BudgetLine, project_id=1, scope="global", amount_cents=2)


def test_client_project_and_location_are_restricted_on_delete(seeded: Engine) -> None:
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), seeded.begin() as conn:
        conn.execute(text("DELETE FROM client WHERE id = 1"))
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), seeded.begin() as conn:
        conn.execute(text("DELETE FROM project WHERE id = 1"))
    insert_row(seeded, BudgetLine, project_id=1, scope="location", location_id=1, amount_cents=1)
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), seeded.begin() as conn:
        conn.execute(text("DELETE FROM location WHERE id = 1"))


def test_location_id_project_id_unique_exists_for_composite_fks(seeded: Engine) -> None:
    with seeded.connect() as conn:
        sql = conn.exec_driver_sql(
            "SELECT sql FROM sqlite_master WHERE name = 'location'"
        ).scalar_one()
    assert "CONSTRAINT uq_location_id UNIQUE (id, project_id)" in str(sql)
