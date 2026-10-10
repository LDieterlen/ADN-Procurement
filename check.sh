#!/usr/bin/env bash
# La porte avant tout commit : lance toutes les vérifications du dépôt (api/ puis web/).
set -euo pipefail
cd "$(dirname "$0")"

# Isolation uv, indépendante de l'environnement appelant : les shells de Claude Code héritent d'un
# UV_PROJECT_ENVIRONMENT d'un autre projet et de UV_FROZEN=1 (ARCHITECTURE §11). Sans ceci, `uv run`
# resynchroniserait ce venv étranger sur le lock de FFE.
export UV_PROJECT_ENVIRONMENT="$PWD/api/.venv"
export UV_FROZEN=0

echo "== api : ruff, pyright, pytest"
(cd api && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest -q)
echo "== web : npm run check (typecheck, prettier, vitest)"
(cd web && npm run check)
echo "OK"
