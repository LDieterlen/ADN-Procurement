"""`ffe` command line: `serve`, `openapi` (step 1); `db …` arrives at step 3."""

import json
from pathlib import Path
from typing import Annotated

import typer
import uvicorn

from ffe.app import Deps, create_app
from ffe.config import load_settings

OPENAPI_PATH = Path(__file__).resolve().parents[2] / "openapi.json"

app = typer.Typer(no_args_is_help=True, add_completion=False)


def openapi_json() -> str:
    """The committed OpenAPI snapshot, as text (shared with `tests/test_openapi.py`)."""
    document = create_app(Deps()).openapi()
    return json.dumps(document, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


@app.command()
def serve(
    reload: Annotated[bool, typer.Option(help="Rechargement automatique (dev).")] = False,
) -> None:
    """Démarre l'API sur 127.0.0.1:8000."""
    settings = load_settings()
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
