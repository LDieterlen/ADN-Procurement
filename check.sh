#!/usr/bin/env bash
# La porte avant tout commit : lance toutes les vérifications du dépôt (api/ puis web/).
# `./check.sh web` ou `./check.sh api` ne lance qu'une partie : autorisé seulement pour un commit
# qui ne touche que ce sous-projet (CLAUDE.md « Avant de committer »).
set -euo pipefail
cd "$(dirname "$0")"
part="${1:-all}"
case "$part" in all|api|web) ;; *) echo "usage : ./check.sh [api|web]" >&2; exit 2 ;; esac

# Isolation uv, indépendante de l'environnement appelant : les shells de Claude Code héritent d'un
# UV_PROJECT_ENVIRONMENT d'un autre projet et de UV_FROZEN=1 (ARCHITECTURE §11). Sans ceci, `uv run`
# resynchroniserait ce venv étranger sur le lock de FFE.
export UV_PROJECT_ENVIRONMENT="$PWD/api/.venv"
export UV_FROZEN=0

if [ "$part" != web ]; then
  echo "== api : ruff, pyright, pytest"
  (cd api && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest -q)
fi
if [ "$part" != api ]; then
  echo "== web : npm run check (typecheck, prettier, vitest)"
  (cd web && npm run check)
fi
echo "OK"
