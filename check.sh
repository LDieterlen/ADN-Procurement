#!/usr/bin/env bash
# La porte avant tout commit : lance toutes les vérifications du dépôt (api/ puis web/).
set -euo pipefail
cd "$(dirname "$0")"

# Le conteneur exporte UV_PROJECT_ENVIRONMENT (venv d'un autre projet) et UV_FROZEN=1 : on isole FFE.
export UV_PROJECT_ENVIRONMENT="${FFE_VENV:-$HOME/.venvs/ffe}"
unset UV_FROZEN

echo "== api : ruff, pyright, pytest"
(cd api && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest -q)
echo "== web : npm run check (typecheck, prettier, vitest)"
(cd web && npm run check)
echo "OK"
