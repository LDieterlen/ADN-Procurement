"""Migrations: replay from an empty file, models = migrations (`alembic check`), STRICT kept."""

from pathlib import Path

from sqlalchemy import Engine, text

from ffe.db.engine import create_db_engine, table_strictness
from ffe.db.migrate import (
    check,
    current_revision,
    downgrade_base,
    has_pending,
    head_revision,
    revision_chain,
    upgrade_head,
)


def test_empty_file_upgrades_to_head_and_matches_models(ext4_tmp: Path) -> None:
    engine = create_db_engine(ext4_tmp / "fresh.sqlite")
    try:
        assert current_revision(engine) is None
        assert has_pending(engine)
        upgrade_head(engine)
        assert current_revision(engine) == head_revision() == "0009"
        assert not has_pending(engine)
        check(engine)  # raises when models and migrations differ
    finally:
        engine.dispose()


def test_revision_chain_is_one_migration_per_step() -> None:
    assert revision_chain() == [
        "0001",
        "0002",
        "0003",
        "0004",
        "0005",
        "0006",
        "0007",
        "0008",
        "0009",
    ]


def test_migration_0001_seeds_the_single_setting_row(engine: Engine) -> None:
    with engine.connect() as conn:
        row = conn.execute(text("SELECT id, default_vat_bp, base_currency FROM setting")).one()
    assert tuple(row) == (1, 2000, "EUR")


def test_every_table_stays_strict_after_upgrade(engine: Engine) -> None:
    strictness = table_strictness(engine)
    non_strict = [name for name, strict in strictness.items() if not strict]
    assert non_strict == ["alembic_version"]  # Alembic's own table, out of our control


def test_downgrade_then_upgrade_again_replays_cleanly(engine: Engine) -> None:
    downgrade_base(engine)
    assert current_revision(engine) is None
    with engine.connect() as conn:
        names = (
            conn.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            )
            .scalars()
            .all()
        )
    assert names == ["alembic_version"]
    upgrade_head(engine)
    assert current_revision(engine) == head_revision()
    check(engine)
