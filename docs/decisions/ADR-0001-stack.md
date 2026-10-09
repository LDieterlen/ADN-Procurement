# ADR-0001 — Stack : back Python, front TypeScript
Date : 2026-10-09
Statut : acceptée

## Contexte
Outil local mono-utilisateur, priorité fiabilité puis simplicité, trois couches (SQLite, API, front). Trois propositions de stack ont été jugées par deux juges le 2026-10-09 (versions vérifiées sur npm et PyPI ce jour) : la voie TypeScript unique est notée 8–8,5/10, la voie Python 6,5–7,5/10, le surcoût retenu contre Python étant deux chaînes d'outils. La voie Python l'emporte sur la couche données : Alembic en mode batch (seul outil du comparatif gérant proprement `ALTER TABLE` sur SQLite), `sqlite3.Connection.backup()` dans la stdlib, Pydantic comme source unique exposée en OpenAPI.

## Décision
L'utilisateur retient la voie Python après lecture de la comparaison, en acceptant le coût des deux chaînes d'outils.
- Back `api/` (projet uv, `native-tls = true`) : Python 3.14, FastAPI 0.143, SQLAlchemy 2.0.x (`Mapped[]`, `naming_convention`), Alembic 1.20 (`render_as_batch=True`, `compare_type=True`), Pydantic v2 + pydantic-settings, Typer (CLI `ffe`), uvicorn.
- Front `web/` (paquet npm) : Vite 8, React 19, TypeScript 7 strict, TanStack Query 5, react-router 7 déclaratif, react-hook-form, Tailwind 4, client openapi-fetch + types openapi-typescript générés depuis `/openapi.json`, Vitest 5, Prettier.
- Qualité : ruff + pyright + pytest côté `api/`, tsc + prettier + vitest côté `web/`, `./check.sh` à la racine. Un dépôt, deux sous-projets, sans outil de workspace, sans ESLint, sans CI.

## Alternatives écartées
- TypeScript unique (better-sqlite3 13 + Drizzle 0.45 + Hono 4) : la mieux notée, mais drizzle-kit recrée les tables sur SQLite sans le filet d'Alembic, et dépend d'un binaire natif.
- TypeScript prospectif (`node:sqlite` + Drizzle 1.0-rc) : `node:sqlite` en stabilité 1.2 (release candidate), Drizzle 1.0 non final.
- Full-stack (Next.js, SvelteKit) : mélange back et UI, contraire aux trois couches voulues et à une future extension navigateur.
- SQLModel (0.0.x, non stabilisé) et SQLAlchemy 2.1 (final le 2026-09-24, trop jeune) : écartés au départ.

## Conséquences
Deux chaînes d'outils (uv, npm) et deux lockfiles. Le contrat API est partagé par génération de types : un test de fraîcheur échoue si `web/src/api/schema.d.ts` diverge de l'OpenAPI servie. Pydantic est la seule validation (422 champ par champ) ; le front ne fait que des contraintes de formulaire minimales. Les exports futurs (xlsx, PDF) se font en Python (openpyxl, WeasyPrint/Jinja2).

## Repli
Passer à SQLAlchemy 2.1 quand les retours de terrain suffiront : changement de version, pas de refonte. Replis de versions documentés : `vite@7.3` (encore maintenu), `typescript@6`. Bascule vers la voie TypeScript unique possible tant que le modèle est documenté en SQL dans `docs/DATA_MODEL.md` et que les migrations sont relues : le fichier SQLite reste identique, seul le back change.
