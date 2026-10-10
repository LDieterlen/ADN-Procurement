"""Migration 0003 schema: CHECKs, unique sha256, one primary per product, FK CASCADE/RESTRICT."""

from typing import Any

import pytest
from sqlalchemy import Engine, insert, text
from sqlalchemy.exc import IntegrityError

from ffe.models import Category, File, Product, ProductFile

NOW = "2026-10-09T12:00:00Z"
SHA = "a" * 64


def insert_row(engine: Engine, model: Any, **values: Any) -> None:
    values.setdefault("created_at", NOW)
    if model is not File:
        values.setdefault("updated_at", NOW)
    with engine.begin() as conn:
        conn.execute(insert(model).values(**values))


@pytest.fixture
def seeded(engine: Engine) -> Engine:
    insert_row(engine, Category, name="Luminaires", code="LUM")
    insert_row(engine, Product, name="A", category_id=1)
    insert_row(
        engine,
        File,
        sha256=SHA,
        ext="png",
        mime_type="image/png",
        size_bytes=10,
        original_name="a.png",
    )
    insert_row(
        engine,
        File,
        sha256="b" * 64,
        ext="jpg",
        mime_type="image/jpeg",
        size_bytes=10,
        original_name="b.jpg",
    )
    return engine


@pytest.mark.parametrize(
    ("values", "constraint"),
    [
        ({"name": "", "category_id": 1}, "name_not_empty"),
        ({"name": "A", "category_id": 1, "unit": "box"}, "unit_enum"),
        ({"name": "A", "category_id": 1, "list_price_cents": -1}, "list_price_min"),
        ({"name": "A", "category_id": 1, "list_price_tax_mode": "ttc"}, "list_price_ttc_needs_vat"),
        ({"name": "A", "category_id": 1, "list_price_on": "10/10/2026"}, "list_price_on_date"),
        ({"name": "A", "category_id": 1, "gtin": "12A"}, "gtin_digits"),
        ({"name": "A", "category_id": 1, "height_mm": -1}, "height_min"),
        ({"name": "A", "category_id": 99}, "FOREIGN KEY"),
    ],
)
def test_product_checks(seeded: Engine, values: dict[str, Any], constraint: str) -> None:
    with pytest.raises(IntegrityError, match=constraint):
        insert_row(seeded, Product, **values)


def test_file_sha256_unique_and_checked(seeded: Engine) -> None:
    with pytest.raises(IntegrityError, match="file.sha256"):
        insert_row(
            seeded,
            File,
            sha256=SHA,
            ext="png",
            mime_type="image/png",
            size_bytes=1,
            original_name="x",
        )
    with pytest.raises(IntegrityError, match="sha256_length"):
        insert_row(
            seeded,
            File,
            sha256="abc",
            ext="png",
            mime_type="image/png",
            size_bytes=1,
            original_name="x",
        )


def test_one_primary_image_per_product(seeded: Engine) -> None:
    insert_row(seeded, ProductFile, product_id=1, file_id=1, is_primary=1)
    with pytest.raises(IntegrityError, match="product_file.product_id"):
        insert_row(seeded, ProductFile, product_id=1, file_id=2, is_primary=1)
    with pytest.raises(IntegrityError, match="primary_is_image"):
        insert_row(seeded, ProductFile, product_id=1, file_id=2, kind="datasheet", is_primary=1)
    with pytest.raises(IntegrityError, match="product_file.product_id, product_file.file_id"):
        insert_row(seeded, ProductFile, product_id=1, file_id=1)


def test_product_delete_cascades_junctions_but_file_is_restricted(seeded: Engine) -> None:
    insert_row(seeded, ProductFile, product_id=1, file_id=1)
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), seeded.begin() as conn:
        conn.execute(text("DELETE FROM file WHERE id = 1"))
    with seeded.begin() as conn:
        conn.execute(text("DELETE FROM product WHERE id = 1"))
        assert conn.execute(text("SELECT count(*) FROM product_file")).scalar_one() == 0


def test_category_in_use_cannot_be_deleted(seeded: Engine) -> None:
    with pytest.raises(IntegrityError, match="FOREIGN KEY"), seeded.begin() as conn:
        conn.execute(text("DELETE FROM category WHERE id = 1"))
