"""Readable export/import of the whole database (ARCHITECTURE §5, format `ffe-export` v1).

Rows go through the models' tables (SQLAlchemy Core): STRICT types and CHECK constraints are
the validation at step 3; Pydantic schemas validate each row from step 4 on (D3.10).
"""

import re
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from sqlalchemy import Engine, Table, delete, insert, select

from ffe.db import DbError
from ffe.db.backup import sync_files
from ffe.db.migrate import current_revision, revision_chain
from ffe.models.base import Base
from ffe.schemas.base import BaseSchema
from ffe.schemas.category import CategoryRead
from ffe.schemas.client import ClientRead
from ffe.schemas.file import FileRead
from ffe.schemas.location import LocationRead
from ffe.schemas.professional import ProfessionalRead
from ffe.schemas.project import ProjectRead
from ffe.schemas.project_item import EventRead, PlacementRead
from ffe.schemas.setting import SettingRead
from ffe.schemas.supplier import SupplierRead

FORMAT = "ffe-export"
VERSION = 1
# Dependency order: parents before children (import), same order on export.
TABLE_ORDER: tuple[str, ...] = (
    "setting",
    "client",
    "category",
    "professional",
    "supplier",
    "file",
    "capture",
    "project",
    "project_indice",
    "location",
    "project_item",
    "project_item_placement",
    "project_item_event",
    "item_code_sequence",
    "project_item_file",
    "budget_line",
    "project_file",
)
# Row validation before insert (D4.11); rows without a schema here are validated by the
# database (STRICT, CHECK, FK) only.
ROW_SCHEMAS: dict[str, type[BaseSchema]] = {
    "setting": SettingRead,
    "client": ClientRead,
    "category": CategoryRead,
    "professional": ProfessionalRead,
    "supplier": SupplierRead,
    "file": FileRead,
    "project": ProjectRead,
    "location": LocationRead,
    "project_item_placement": PlacementRead,
    "project_item_event": EventRead,
}


class JsonIoError(DbError):
    pass


def to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.capitalize() for part in rest)


def to_snake(name: str) -> str:
    return re.sub(r"([A-Z])", lambda m: "_" + m.group(1).lower(), name)


def _tables() -> list[Table]:
    return [Base.metadata.tables[name] for name in TABLE_ORDER]


def export_json(engine: Engine, clock: Callable[[], datetime]) -> dict[str, Any]:
    tables: dict[str, list[dict[str, Any]]] = {}
    with engine.connect() as conn:
        for table in _tables():
            rows = conn.execute(select(table).order_by(*table.primary_key.columns)).mappings().all()
            tables[table.name] = [{to_camel(k): v for k, v in row.items()} for row in rows]
    return {
        "format": FORMAT,
        "version": VERSION,
        "exportedAt": clock().astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schemaRevision": current_revision(engine),
        "tables": tables,
    }


def _validate_document(document: dict[str, Any], engine: Engine) -> None:
    if document.get("format") != FORMAT or document.get("version") != VERSION:
        raise JsonIoError(f"Format attendu : {FORMAT} v{VERSION}.")
    revision = document.get("schemaRevision")
    chain = revision_chain()
    current = current_revision(engine)
    if revision not in chain:
        raise JsonIoError(f"Révision de schéma inconnue : {revision!r}.")
    if current is None or chain.index(str(revision)) > chain.index(current):
        raise JsonIoError(
            f"Export plus récent ({revision}) que la base ({current}) : migrer d'abord."
        )
    unknown = set(document.get("tables", {})) - set(TABLE_ORDER)
    if unknown:
        raise JsonIoError(f"Tables inconnues dans l'export : {sorted(unknown)}.")


def import_json(engine: Engine, document: dict[str, Any], replace: bool = False) -> dict[str, int]:
    """Loads rows into an empty database (or empties it first with `replace`); ids are kept.

    The caller is responsible for the pre-import backup when `replace` is set.
    """
    _validate_document(document, engine)
    tables = document.get("tables", {})
    imported: dict[str, int] = {}
    with engine.begin() as conn:
        if replace:
            for table in reversed(_tables()):
                conn.execute(delete(table))
        for table in _tables():
            rows: list[dict[str, Any]] = tables.get(table.name, [])
            existing: list[Any] = (
                list(conn.execute(select(table.c.id)).all()) if "id" in table.c else []
            )
            if table.name == "setting":
                # Single row, seeded by migration 0001: an import overwrites it.
                conn.execute(delete(table))
            elif existing:
                raise JsonIoError(
                    f"La table {table.name} n'est pas vide : utiliser --replace (sauvegarde d'abord)."
                )
            columns = set(table.c.keys())
            schema = ROW_SCHEMAS.get(table.name)
            for index, row in enumerate(rows):
                data = {to_snake(k): v for k, v in row.items()}
                unknown = set(data) - columns
                if unknown:
                    raise JsonIoError(f"Colonnes inconnues pour {table.name} : {sorted(unknown)}.")
                if schema is not None:
                    try:
                        schema.model_validate(row)
                    except ValidationError as error:
                        first = error.errors()[0]
                        raise JsonIoError(
                            f"{table.name}[{index}] : {'.'.join(str(p) for p in first['loc'])} "
                            f"— {first['msg']}"
                        ) from None
                conn.execute(insert(table).values(**data))
            imported[table.name] = len(rows)
    return imported


def export_files(files_dir: Path, target_dir: Path) -> int:
    """`export-json --with-files`: copies `files/` next to the document (content-addressed names,
    so the export stays readable on its own). Returns the number of files copied."""
    return sync_files(files_dir, target_dir)
