"""`ffe` command line: `serve`, `openapi`, `db migrate|backup|restore|check|export-json|import-json`."""

import json
import os
import sys
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated

import typer
import uvicorn
from sqlalchemy import Engine

from ffe.app import create_app
from ffe.config import Settings, load_settings
from ffe.db import DbError
from ffe.db.backup import backup as make_backup
from ffe.db.backup import restore as restore_backup
from ffe.db.engine import (
    create_db_engine,
    foreign_key_check,
    integrity_check,
    quick_check,
    row_counts,
    table_strictness,
)
from ffe.db.json_io import export_json, import_json
from ffe.db.lock import InstanceLock
from ffe.db.migrate import current_revision, head_revision, upgrade_head
from ffe.db.startup import prepare_data_dir
from ffe.deps import Deps, utcnow

OPENAPI_PATH = Path(__file__).resolve().parents[2] / "openapi.json"

app = typer.Typer(no_args_is_help=True, add_completion=False)
db = typer.Typer(
    no_args_is_help=True, help="Base de données (serveur arrêté : le verrou le garantit)."
)
app.add_typer(db, name="db")

ProdFlag = Annotated[
    bool, typer.Option("--prod", help="Base réelle (~/.persist/ffe) au lieu de la base de dev.")
]


def openapi_json() -> str:
    """The committed OpenAPI snapshot, as text (shared with `tests/test_openapi.py`)."""
    document = create_app(Deps()).openapi()
    return json.dumps(document, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def _settings(prod: bool) -> Settings:
    if prod:
        os.environ["FFE_ENV"] = "prod"
    return load_settings()


def _fail(error: DbError) -> None:
    typer.echo(f"Erreur : {error}", err=True)
    raise typer.Exit(code=1)


@contextmanager
def _opened(prod: bool) -> Generator[tuple[Settings, Engine]]:
    """Data dir checked, lock held, engine open; released on exit. Errors become exit code 1."""
    settings = _settings(prod)
    try:
        prepare_data_dir(settings)
        with InstanceLock(settings.lock_path):
            engine = create_db_engine(settings.db_path)
            try:
                yield settings, engine
            finally:
                engine.dispose()
    except DbError as error:
        _fail(error)


@app.command()
def serve(
    reload: Annotated[bool, typer.Option(help="Rechargement automatique (dev).")] = False,
    prod: ProdFlag = False,
) -> None:
    """Démarre l'API sur 127.0.0.1:8000 (cycle de démarrage dans ffe.main)."""
    settings = _settings(prod)
    uvicorn.run(
        "ffe.main:app",
        host=settings.host,
        port=settings.port,
        reload=reload,
        reload_dirs=["src"] if reload else None,
    )


@app.command()
def openapi() -> None:
    """Écrit api/openapi.json depuis create_app().openapi()."""
    OPENAPI_PATH.write_text(openapi_json(), encoding="utf-8")
    typer.echo(f"Écrit : {OPENAPI_PATH}")


@db.command()
def migrate(prod: ProdFlag = False) -> None:
    """Sauvegarde, puis alembic upgrade head, puis foreign_key_check et quick_check."""
    with _opened(prod) as (settings, engine):
        head = head_revision()
        current = current_revision(engine)
        if current == head:
            typer.echo(f"Déjà à jour : {head}")
            return
        made = make_backup(engine, settings.backups_dir, utcnow, label=f"pre-migrate-{head}")
        typer.echo(f"Sauvegarde : {made if made else 'skipped (base absente)'}")
        upgrade_head(engine)
        violations = foreign_key_check(engine)
        verdict = quick_check(engine)
        if violations or verdict != "ok":
            _fail(DbError(f"après migration : fk={len(violations)} quick_check={verdict}"))
        typer.echo(f"Migré : {current} → {head} ; quick_check ok")


@db.command()
def backup(
    label: Annotated[str | None, typer.Option(help="Suffixe du fichier de sauvegarde.")] = None,
    prod: ProdFlag = False,
) -> None:
    """Sauvegarde locale (sqlite3 backup API + quick_check + rotation)."""
    with _opened(prod) as (settings, engine):
        try:
            made = make_backup(engine, settings.backups_dir, utcnow, label=label)
        except DbError as error:
            _fail(error)
            return
        typer.echo(str(made) if made else "Aucune base à sauvegarder.")


@db.command()
def restore(
    file: Annotated[Path, typer.Argument(help="Fichier .sqlite à restaurer.")],
    yes: Annotated[bool, typer.Option("--yes", help="Ne pas demander de confirmation.")] = False,
    prod: ProdFlag = False,
) -> None:
    """Vérifie le fichier, sauvegarde la base actuelle (pre-restore), remplace."""
    with _opened(prod) as (settings, engine):
        if not yes:
            typer.confirm(f"Remplacer {settings.db_path} par {file} ?", abort=True)
        try:
            safety = restore_backup(engine, file, settings.backups_dir, utcnow)
        except DbError as error:
            _fail(error)
            return
        typer.echo(f"Restauré depuis {file} ; copie de l'ancienne base : {safety}")


@db.command()
def check(prod: ProdFlag = False) -> None:
    """integrity_check, foreign_key_check, tables avec leur drapeau STRICT, comptages."""
    with _opened(prod) as (settings, engine):
        if not settings.db_path.exists():
            _fail(DbError(f"Aucune base : {settings.db_path} (lancer `ffe db migrate`)."))
        typer.echo(f"Base : {settings.db_path}")
        typer.echo(f"Révision : {current_revision(engine)} (head {head_revision()})")
        typer.echo(f"integrity_check : {integrity_check(engine)}")
        typer.echo(f"foreign_key_check : {len(foreign_key_check(engine))} violation(s)")
        counts = row_counts(engine)
        for name, strict in table_strictness(engine).items():
            typer.echo(
                f"  {name:<24} {'STRICT' if strict else 'NON STRICT':<11} {counts[name]} ligne(s)"
            )


@db.command("export-json")
def export_json_cmd(
    output: Annotated[
        Path | None, typer.Argument(help="Fichier de sortie (défaut : stdout).")
    ] = None,
    prod: ProdFlag = False,
) -> None:
    """Copie lisible de toutes les tables (format ffe-export v1)."""
    with _opened(prod) as (_settings, engine):
        text = json.dumps(export_json(engine, utcnow), indent=2, ensure_ascii=False) + "\n"
        if output is None:
            sys.stdout.write(text)
        else:
            output.write_text(text, encoding="utf-8")
            typer.echo(f"Écrit : {output}")


@db.command("import-json")
def import_json_cmd(
    file: Annotated[Path, typer.Argument(help="Fichier ffe-export à charger.")],
    replace: Annotated[
        bool, typer.Option("--replace", help="Vider la base d'abord (sauvegarde préalable).")
    ] = False,
    prod: ProdFlag = False,
) -> None:
    """Charge un export dans une base vide (ou vidée avec --replace)."""
    with _opened(prod) as (settings, engine):
        document = json.loads(file.read_text(encoding="utf-8"))
        try:
            if replace:
                made = make_backup(engine, settings.backups_dir, utcnow, label="pre-import")
                typer.echo(f"Sauvegarde : {made}")
            imported = import_json(engine, document, replace=replace)
        except DbError as error:
            _fail(error)
            return
        for name, count in imported.items():
            typer.echo(f"  {name:<24} {count} ligne(s)")
