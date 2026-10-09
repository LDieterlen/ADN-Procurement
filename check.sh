#!/usr/bin/env bash
# La porte avant tout commit : lance toutes les vérifications du dépôt.
# Étape 0 : aucun sous-projet n'existe encore ; le script détecte api/ et web/ quand ils apparaîtront (étape 1).
set -euo pipefail
cd "$(dirname "$0")"

ran=0
if [ -f api/pyproject.toml ]; then
  echo "== api : ruff, pyright, pytest"
  (cd api && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest -q)
  ran=1
fi
if [ -f web/package.json ]; then
  echo "== web : npm run check (typecheck, prettier, vitest)"
  (cd web && npm run check)
  ran=1
fi
if [ "$ran" = 0 ]; then
  echo "Aucun sous-projet à vérifier pour l'instant (étape 0 : documentation et configuration seulement)."
fi
echo "OK"
