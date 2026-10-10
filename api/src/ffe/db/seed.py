"""Reference data: the 13 level-1 categories (D0.9 / D6a.1), idempotent by `code`."""

from collections.abc import Callable
from datetime import UTC, datetime

from sqlalchemy import Engine, text

SEED_VERSION = 1

# (code, name, sort_order) — `code` is stable, `name` is editable afterwards.
CATEGORIES: tuple[tuple[str, str, int], ...] = (
    ("AS", "Assises", 10),
    ("TAB", "Tables", 20),
    ("RAN", "Rangements", 30),
    ("LIT", "Literie", 40),
    ("LUM", "Luminaires", 50),
    ("TXT", "Textiles", 60),
    ("DEC", "Décoration", 70),
    ("CUI", "Cuisine", 80),
    ("SAN", "Sanitaire", 90),
    ("MEN", "Menuiserie", 100),
    ("EQU", "Équipement", 110),
    ("FRA", "Frais", 120),
    ("DIV", "Divers", 130),
)


def seed_categories(engine: Engine, clock: Callable[[], datetime]) -> int:
    """Inserts the missing level-1 categories; returns how many were added."""
    now = clock().astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    inserted = 0
    with engine.begin() as conn:
        for code, name, sort_order in CATEGORIES:
            result = conn.execute(
                text(
                    "INSERT INTO category (parent_id, code, name, sort_order, created_at, updated_at) "
                    "VALUES (NULL, :code, :name, :sort_order, :now, :now) "
                    "ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING"
                ),
                {"code": code, "name": name, "sort_order": sort_order, "now": now},
            )
            inserted += result.rowcount
        conn.execute(
            text("UPDATE setting SET seed_category_version = :v, updated_at = :now WHERE id = 1"),
            {"v": SEED_VERSION, "now": now},
        )
    return inserted
