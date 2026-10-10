"""Migration 0002 schema: CHECKs, expression and partial unique indexes, FK RESTRICT (DATA_MODEL §4.5–4.7)."""

from typing import Any

import pytest
from sqlalchemy import Engine, insert, text
from sqlalchemy.exc import IntegrityError

from ffe.models import Category, Manufacturer, Supplier

NOW = "2026-10-09T12:00:00Z"
EXPECTED_INDEXES = {
    "uq_category_parent_name": "COALESCE(parent_id, 0), name",
    "uq_category_code": "WHERE code IS NOT NULL",
    "uq_manufacturer_name_lower": "lower(name)",
    "uq_supplier_siret": "WHERE siret IS NOT NULL",
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


def test_category_code_only_on_level_one(engine: Engine) -> None:
    insert_row(engine, Category, name="Luminaires", code="LUM")
    with pytest.raises(IntegrityError, match="code_on_level1_only"):
        insert_row(engine, Category, name="Sans code")
    with pytest.raises(IntegrityError, match="code_on_level1_only"):
        insert_row(engine, Category, name="Enfant codé", parent_id=1, code="APP")


@pytest.mark.parametrize("code", ["L", "LUMIN", "lum", "LU1"])
def test_category_code_format(engine: Engine, code: str) -> None:
    with pytest.raises(IntegrityError, match="code_format"):
        insert_row(engine, Category, name="X", code=code)


def test_category_name_unique_per_parent_including_root(engine: Engine) -> None:
    insert_row(engine, Category, name="Luminaires", code="LUM")
    with pytest.raises(IntegrityError, match="uq_category_parent_name"):
        insert_row(engine, Category, name="Luminaires", code="LU")
    insert_row(engine, Category, name="Divers", parent_id=1)
    with pytest.raises(IntegrityError, match="uq_category_parent_name"):
        insert_row(engine, Category, name="Divers", parent_id=1)


def test_category_code_unique(engine: Engine) -> None:
    insert_row(engine, Category, name="A", code="LUM")
    with pytest.raises(IntegrityError, match="category.code"):
        insert_row(engine, Category, name="B", code="LUM")


def test_category_parent_is_restricted_on_delete(engine: Engine) -> None:
    insert_row(engine, Category, name="Luminaires", code="LUM")
    insert_row(engine, Category, name="Applique", parent_id=1)
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), engine.begin() as conn:
        conn.execute(text("DELETE FROM category WHERE id = 1"))


def test_manufacturer_lower_name_unique(engine: Engine) -> None:
    insert_row(engine, Manufacturer, name="Flos")
    with pytest.raises(IntegrityError, match="uq_manufacturer_name_lower"):
        insert_row(engine, Manufacturer, name="fLOS")


def test_supplier_siret_rules(engine: Engine) -> None:
    insert_row(engine, Supplier, name="A", siren="123456789", siret="12345678900012")
    with pytest.raises(IntegrityError, match="siret_format"):
        insert_row(engine, Supplier, name="B", siren="123456789", siret="99999999900012")
    with pytest.raises(IntegrityError, match="siret_format"):
        insert_row(engine, Supplier, name="C", siret="1234")
    with pytest.raises(IntegrityError, match="supplier.siret"):
        insert_row(engine, Supplier, name="D", siret="12345678900012")
    insert_row(engine, Supplier, name="E", siret=None)
    insert_row(engine, Supplier, name="F", siret=None)  # NULLs do not collide


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"name": ""}, "name_not_empty"),
        ({"name": "A", "currency": "EURO"}, "currency_length"),
        ({"name": "A", "country_code": "FRA"}, "country_code_length"),
        ({"name": "A", "default_discount_bp": 10001}, "default_discount_bp_range"),
        ({"name": "A", "siren": "12"}, "siren_format"),
    ],
)
def test_supplier_checks(engine: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(engine, Supplier, **values)


def test_setting_has_seed_version_column_with_default(engine: Engine) -> None:
    with engine.connect() as conn:
        assert conn.execute(text("SELECT seed_category_version FROM setting")).scalar_one() == 0
