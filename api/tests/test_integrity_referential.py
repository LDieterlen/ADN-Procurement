"""Schema v0: category, professional and supplier CHECKs, expression and partial unique indexes."""

from typing import Any

import pytest
from sqlalchemy import Engine, insert, text
from sqlalchemy.exc import IntegrityError

from ffe.models import Category, Professional, Supplier

NOW = "2026-10-09T12:00:00Z"
EXPECTED_INDEXES = {
    "uq_category_name_lower": "lower(name)",
    "uq_professional_name_lower": "lower(name)",
    "uq_project_item_placement_location": "COALESCE(location_id, 0)",
    "uq_budget_line_scope": "COALESCE(supplier_id, 0)",
    "uq_product_file_primary": "WHERE is_primary = 1",
    "uq_project_item_file_primary": "WHERE is_primary = 1",
}


def insert_row(engine: Engine, model: Any, **values: Any) -> None:
    values.setdefault("created_at", NOW)
    values.setdefault("updated_at", NOW)
    with engine.begin() as conn:
        conn.execute(insert(model).values(**values))


def test_hand_written_indexes_exist_as_documented(engine: Engine) -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT name, sql FROM sqlite_master WHERE type = 'index'"
        ).all()
    by_name = {str(name): str(sql) for name, sql in rows if sql}
    for name, fragment in EXPECTED_INDEXES.items():
        assert fragment in by_name[name], name


@pytest.mark.parametrize("code", ["L", "LUMIN", "lum", "LU1"])
def test_category_code_format(engine: Engine, code: str) -> None:
    with pytest.raises(IntegrityError, match="code_format"):
        insert_row(engine, Category, name="X", code=code)


def test_category_code_and_lower_name_unique(engine: Engine) -> None:
    insert_row(engine, Category, name="Luminaire", code="LUM")
    with pytest.raises(IntegrityError, match="category.code"):
        insert_row(engine, Category, name="B", code="LUM")
    with pytest.raises(IntegrityError, match="uq_category_name_lower"):
        insert_row(engine, Category, name="LUMINAIRE", code="LU")


def test_professional_lower_name_unique(engine: Engine) -> None:
    insert_row(engine, Professional, name="Flos")
    with pytest.raises(IntegrityError, match="uq_professional_name_lower"):
        insert_row(engine, Professional, name="fLOS")


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"name": ""}, "name_not_empty"),
        ({"name": "A", "currency": "EURO"}, "currency_length"),
        ({"name": "A", "default_discount_bp": 10001}, "default_discount_bp_range"),
    ],
)
def test_supplier_checks(engine: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(engine, Supplier, **values)


def test_setting_has_seed_version_column_with_default(engine: Engine) -> None:
    with engine.connect() as conn:
        assert conn.execute(text("SELECT seed_category_version FROM setting")).scalar_one() == 0
