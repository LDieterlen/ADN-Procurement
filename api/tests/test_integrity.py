"""The schema itself: STRICT, CHECK constraints, pragmas (DATA_MODEL §3, §4.1, §4.2)."""

from typing import Any

import pytest
from sqlalchemy import Engine, insert, text
from sqlalchemy.exc import IntegrityError

from ffe.db.engine import table_strictness
from ffe.models import Client, Setting

NOW = "2026-10-09T12:00:00Z"


def insert_client(engine: Engine, **overrides: Any) -> None:
    values: dict[str, Any] = {"name": "Famille Martin", "created_at": NOW, "updated_at": NOW}
    values.update(overrides)
    with engine.begin() as conn:
        conn.execute(insert(Client).values(**values))


def test_all_tables_are_strict(engine: Engine) -> None:
    strictness = table_strictness(engine)
    assert set(strictness) >= {"setting", "client"}
    assert all(strictness[name] for name in strictness if name != "alembic_version")


def test_strict_rejects_text_in_integer_column(engine: Engine) -> None:
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(text("UPDATE setting SET seed_category_version = 'deux' WHERE id = 1"))


def test_setting_is_single_row(engine: Engine) -> None:
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(insert(Setting).values(id=2, created_at=NOW, updated_at=NOW))


def test_setting_base_currency_is_eur_only(engine: Engine) -> None:
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(text("UPDATE setting SET base_currency = 'GBP' WHERE id = 1"))


def test_client_name_must_not_be_empty(engine: Engine) -> None:
    with pytest.raises(IntegrityError):
        insert_client(engine, name="")


def test_client_kind_is_enumerated(engine: Engine) -> None:
    insert_client(engine, kind="company")
    with pytest.raises(IntegrityError):
        insert_client(engine, kind="association")


def test_client_country_code_has_two_letters(engine: Engine) -> None:
    with pytest.raises(IntegrityError):
        insert_client(engine, country_code="FRA")


@pytest.mark.parametrize("siren", ["12345678", "1234567890", "12345678A"])
def test_client_siren_must_be_nine_digits(engine: Engine, siren: str) -> None:
    with pytest.raises(IntegrityError):
        insert_client(engine, siren=siren)


def test_client_siren_accepts_nine_digits_or_null(engine: Engine) -> None:
    insert_client(engine, siren="123456789")
    insert_client(engine, siren=None)


def test_pragmas_are_active_on_every_connection(engine: Engine) -> None:
    with engine.connect() as conn:
        assert conn.exec_driver_sql("PRAGMA journal_mode").scalar_one() == "wal"
        assert conn.exec_driver_sql("PRAGMA synchronous").scalar_one() == 2  # FULL
        assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar_one() == 1
        assert conn.exec_driver_sql("PRAGMA busy_timeout").scalar_one() == 5000
        assert conn.exec_driver_sql("PRAGMA trusted_schema").scalar_one() == 0
