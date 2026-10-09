"""Contract freshness: `api/openapi.json` must match what the app produces (ARCHITECTURE §4)."""

from ffe.cli import OPENAPI_PATH, openapi_json


def test_committed_openapi_matches_app() -> None:
    assert OPENAPI_PATH.is_file(), "lancer `uv run ffe openapi`"
    assert OPENAPI_PATH.read_text(encoding="utf-8") == openapi_json(), (
        "api/openapi.json est périmé : lancer `uv run ffe openapi` puis `npm run gen:api`"
    )
