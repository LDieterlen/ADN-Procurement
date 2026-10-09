#!/usr/bin/env bash
# La porte avant tout commit : lance toutes les vérifications du dépôt (api/ puis web/).
set -euo pipefail
cd "$(dirname "$0")"

echo "== api : ruff, pyright, pytest"
(cd api && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest -q)
echo "== web : npm run check (typecheck, prettier, vitest)"
(cd web && npm run check)
echo "OK"
