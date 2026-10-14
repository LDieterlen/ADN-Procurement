"""Reference data: the 21 product types (ADR-0013, revised 2026-10-13), idempotent by `code`."""

from collections.abc import Callable
from datetime import UTC, datetime

from sqlalchemy import Engine, text

SEED_VERSION = 3

# (code, name, sort_order) — `code` is stable, `name` is editable afterwards.
CATEGORIES: tuple[tuple[str, str, int], ...] = (
    ("AS", "Assise", 10),
    ("TAB", "Table", 20),
    ("TBR", "Tabouret", 30),
    ("AGE", "Agencement", 40),
    ("LIT", "Lit", 50),
    ("TAP", "Tapis", 60),
    ("RID", "Rideau", 70),
    ("LIN", "Linge", 80),
    ("LUA", "Luminaire architectural", 90),
    ("LUD", "Luminaire décoratif", 100),
    ("MIR", "Miroir", 110),
    ("DEC", "Décoration", 120),
    ("ART", "Œuvre d'art", 130),
    ("ACC", "Accessoire", 140),
    ("ACA", "Accastillage", 150),
    ("QUI", "Quincaillerie", 160),
    ("SAN", "Sanitaire", 165),
    ("SIG", "Signalétique", 170),
    ("REV", "Revêtement", 175),
    ("EQU", "Équipement", 180),
    ("DIV", "Divers", 190),
)


def seed_categories(engine: Engine, clock: Callable[[], datetime]) -> int:
    """Inserts the missing product types; returns how many were added."""
    now = clock().astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    inserted = 0
    with engine.begin() as conn:
        for code, name, sort_order in CATEGORIES:
            result = conn.execute(
                text(
                    "INSERT INTO category (code, name, sort_order, created_at, updated_at) "
                    "VALUES (:code, :name, :sort_order, :now, :now) "
                    "ON CONFLICT (code) DO NOTHING"
                ),
                {"code": code, "name": name, "sort_order": sort_order, "now": now},
            )
            inserted += result.rowcount
        conn.execute(
            text("UPDATE setting SET seed_category_version = :v, updated_at = :now WHERE id = 1"),
            {"v": SEED_VERSION, "now": now},
        )
    return inserted
