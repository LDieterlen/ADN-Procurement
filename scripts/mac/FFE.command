#!/bin/bash
# FFE on a Mac (ADR-0019): double-click → the real base served on 127.0.0.1:8000, Chrome opened on it.
# Closing this Terminal window (or Ctrl+C) stops FFE. A Finder alias on the Desktop works too.
set -euo pipefail

FFE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
URL="http://127.0.0.1:8000"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# WeasyPrint (PDF) finds Pango in Homebrew's libraries.
export DYLD_FALLBACK_LIBRARY_PATH="$(brew --prefix)/lib${DYLD_FALLBACK_LIBRARY_PATH:+:$DYLD_FALLBACK_LIBRARY_PATH}"
export FFE_BACKUP_DIR="${FFE_BACKUP_DIR:-$HOME/Documents/FFE-sauvegardes}"
mkdir -p "$FFE_BACKUP_DIR"

open_ffe() { open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"; }
alive() { curl -fsS "$URL/api/v1/health" >/dev/null 2>&1; }

if alive; then # already running (another window): just show it
  open_ffe
  exit 0
fi

cd "$FFE_ROOT/api"
uv run ffe serve --prod &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT INT TERM
for _ in $(seq 120); do
  alive && break
  kill -0 "$server" 2>/dev/null || { echo "FFE n'a pas démarré : lire le message ci-dessus."; read -r -p "Entrée pour fermer."; exit 1; }
  sleep 0.5
done
open_ffe
echo
echo "FFE est ouvert sur $URL. Laisser cette fenêtre ouverte ; la fermer arrête FFE."
wait "$server"
