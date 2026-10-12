"""`ffe db seed`: the 19 product types, idempotent by code, names editable (ADR-0013)."""

from sqlalchemy import Engine, text

from ffe.db.seed import CATEGORIES, SEED_VERSION, seed_categories
from ffe.deps import Clock


def codes(engine: Engine) -> list[str]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT code FROM category ORDER BY sort_order")).scalars()
        return [str(c) for c in rows]


def test_seed_inserts_the_nineteen_codes_in_order(engine: Engine, clock: Clock) -> None:
    assert seed_categories(engine, clock) == 19
    assert codes(engine) == [code for code, _, _ in CATEGORIES]
    assert codes(engine)[0] == "AS" and codes(engine)[-1] == "DIV"
    with engine.connect() as conn:
        assert (
            conn.execute(text("SELECT seed_category_version FROM setting")).scalar_one()
            == SEED_VERSION
        )


def test_seed_is_idempotent_and_keeps_renamed_categories(engine: Engine, clock: Clock) -> None:
    seed_categories(engine, clock)
    with engine.begin() as conn:
        conn.execute(text("UPDATE category SET name = 'Éclairage' WHERE code = 'LUD'"))
        conn.execute(text("DELETE FROM category WHERE code = 'DIV'"))
    assert seed_categories(engine, clock) == 1  # only the deleted one comes back
    with engine.connect() as conn:
        assert (
            conn.execute(text("SELECT name FROM category WHERE code = 'LUD'")).scalar_one()
            == "Éclairage"
        )
        assert conn.execute(text("SELECT count(*) FROM category")).scalar_one() == 19
