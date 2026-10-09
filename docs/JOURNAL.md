# Journal des sessions

Un paragraphe par session, du plus récent au plus ancien. Contenu fixe : **date**, **étape**, **décisions** numérotées `D<étape>.<n>` avec la réponse (ou « défaut » si appliqué par silence, « défaut, à confirmer » si l'utilisateur ne s'est pas encore prononcé), **commits** (message, hash), **reste** (à vérifier par l'utilisateur, parqué, reporté). Dix lignes maximum par session hors listes de décisions. Une décision inscrite ici ne se redemande pas : elle se cite. Une décision structurante va aussi dans `docs/decisions/`.

---

## 2026-10-09 — Étape 2 : modèle de données validé (aucun code)

**Fait** : `DATA_MODEL.md` passé de brouillon à modèle validé : en-tête, `setting` réduite à l'étape 3 avec chaque autre colonne datée de son étape (D2.8), `project.contingency_bp` reporté à l'étape 8 (D2.6), transitions `cancelled → draft` et `replaced` tranchées (D2.10), code projet tranché (D2.12), accroches §9 complétées (snapshot ventilé, snapshot en devise), §10 « Questions ouvertes » remplacé par **« Rejeu des 12 cas »** (tables, calculs `div_round`, résultats au centime recoupés par script). ADR-0005 passée « acceptée » (25 lignes). Aucun fichier de code touché.

**Décisions** (défauts, tous acceptés par l'utilisateur « vas y ») : D2.1 statuts + `on_hold` ; D2.2 codes `<CAT>-NNN` ; D2.3 multiplicateur ≥ 1, changement après validation = événement `qty` sans revalidation ; D2.4 devise + `fx_rate_micro` figés par ligne, taux manuel, surcharge libre de la devise fournisseur ; D2.5 TVA ligne → projet → `setting`, taux 0 permis, pas de TVA d'achat en v1 ; D2.6 contingence à l'étape 8 ; D2.7 millièmes ; D2.8 `setting` stricte (0001 = `id`, `default_vat_bp`, `base_currency`) ; D2.9 snapshot EUR seul ; D2.10 réouverture refusée après `ordered`, `replaced` depuis `approved` seulement ; D2.11 pas de `schedule_revision` ; D2.12 code projet `MAX + 1` ; D2.13 TTC étranger : taux saisi ; D2.14 Validé par zone approché ; D2.15 rejeu en §10.

**Consignes de collaboration reçues** : l'utilisateur valide les choix de conception, pas les calculs → le critère « rejeu sur papier par l'utilisateur » est remplacé par « calculé et recoupé par Claude, prouvé par les tests » ; **blinder les tests de calcul** → livrable de 7a précisé dans la ROADMAP (12 cas de référence, cas limites, propriétés, égalité avec les CTE SQL).

**Commits** : `docs(docs): étape 2 — modèle de données tranché (D2.1–D2.15), rejeu des 12 cas, ADR-0005 acceptée` (`4afeb55`) ; `docs(repo): étape 2 close — feuille de route, journal` (dernier commit de la session).

**Reste** : rien de parqué. **Prochaine étape : 3 — Infrastructure base (migration 0001)**, décisions D3.1 (valeurs de `setting` : `default_vat_bp` 2000, `base_currency` 'EUR' ; les autres colonnes n'existent plus en 0001), D3.2 rotation, D3.3 sauvegarde avant `upgrade`, D3.4 sélection dev/réel ; dépendances à ajouter : `sqlalchemy` 2.0.x, `alembic`.

## 2026-10-09 — Étape 1 : squelette outillage

**Fait** : `api/` (projet uv : `create_app(deps)`, `GET /api/v1/health` → `{ok}`, CLI `ffe serve [--reload]` et `ffe openapi`, service statique de `web/dist/` avec repli `index.html`, 7 tests pytest dont `test_openapi.py`) ; `web/` (Vite 8 `host:true` + proxy `/api`, React 19, Tailwind 4, Prettier, Vitest ; `src/api/client.ts` seul importeur d'openapi-fetch, `queries/health.ts`, page « API OK », `scripts/gen-api.ts` partagé avec `tests/schema-freshness.test.ts`, `tests/boundaries.test.ts`) ; `check.sh` complété ; `.claude/settings.json` élargi. `./check.sh` vert ; `npm run build` puis `uv run ffe serve` sert l'interface sur `127.0.0.1:8000` ; une route modifiée sans `ffe openapi` + `gen:api` fait échouer `test_openapi.py` puis `schema-freshness.test.ts` (vérifié).

**Versions installées** : Python 3.14.7, FastAPI 0.143.0, uvicorn 0.54.0, Typer 0.27.3, pydantic-settings 2.15.0, pytest 9.1.1, httpx2 2.13.1 (demandé par Starlette pour `TestClient`, à la place d'httpx), ruff 0.17.0, pyright 1.1.414 ; Vite 8.3.4, React 19.3.0, TypeScript 6.0.3, Vitest 5.0.3, Prettier 3.9.9, Tailwind 4.3.3, openapi-fetch 0.17.0, openapi-typescript 7.13.0, @vitejs/plugin-react 6.1.2, @types/node 24.19.2.

**Décisions** (défauts acceptés par l'utilisateur) :

- D1.1 Ports 8000 (API) / 5173 (Vite) — défaut, **révisé le même jour à la demande de l'utilisateur : Vite sur 5180** (`strictPort`), car 5173 est le port par défaut de Vite et un autre projet (`Jeux vidéo/Epoques`) l'occupait. L'API reste sur 8000.
- D1.2 SQLAlchemy 2.0.x, pas 2.1 ; `sqlalchemy` et `alembic` ne sont ajoutés qu'à l'étape 3. — défaut.
- D1.3 Tailwind dès maintenant. — défaut.
- D1.4 uv `native-tls = true` → écrit `system-certs = true` (nouveau nom, uv 0.12 déprécie l'ancien). — défaut.
- D1.5 `api/openapi.json` commité par `ffe openapi`, source de `gen:api`, deux tests de fraîcheur. — défaut.
- D1.6 TypeScript : option (a) « TS 7 + `overrides` npm » **échoue** (npm hisse les peers à la racine : ERESOLVE ; et `typescript@7.0.2` n'a plus `lib/typescript.js`, qu'openapi-typescript 7.13 importe à l'exécution). **Repli (b) appliqué : TypeScript 6.0.3** (dernière lignée JS, repli nommé dans ADR-0001), `overrides: { "openapi-typescript": { "typescript": "$typescript" } }`. Retour à TS 7 quand openapi-typescript n'importera plus le compilateur. — défaut (a) puis repli (b), consigné ici.
- D1.7 react-router 7 (pas 8), TanStack Query et react-hook-form : non installés avant l'étape 5. — défaut.
- D1.8 Tests : `pytest` + `httpx2` côté API ; `vitest` seul côté front (jsdom et Testing Library à l'étape 5). — défaut.
- D1.9 `web/dist/` servi par FastAPI dès l'étape 1, monté seulement si `index.html` existe. — défaut.

**Faits d'environnement** (maître : ARCHITECTURE §11) : les shells de Claude Code (pas le terminal de l'utilisateur) héritent d'`UV_PROJECT_ENVIRONMENT=~/.venvs/racoon` et `UV_FROZEN=1` depuis `~/.persist/claude/settings.json` ; corrigé par le bloc `env` de `.claude/settings.json` du projet. Venv unique pour tous : `api/.venv` → lien vers `~/.venvs/ffe` (pytest 0,7 s au lieu de 3,9 s sur 9p). Port 5173 occupé lors du premier essai par le Vite d'un autre projet (`Jeux vidéo/Epoques`) : `strictPort: true` a refusé volontairement ; FFE passe sur 5180 (D1.1 révisée). `npm create vite` sans TTY échoue : `web/` écrit à la main. Pyright 1.1.414 refuse `typeCheckingMode` dans `executionEnvironments` → `strict = ["src"]`.

**Commits** : `feat(api): squelette FastAPI, CLI ffe serve/openapi, route de santé et tests` (`8de723d`) ; `feat(web): squelette Vite/React, page « API OK », contrat généré et tests de fraîcheur` (`664a309`) ; `docs(repo): étape 1 — commandes, architecture, API, journal, feuille de route` (dernier commit de la session).

**À vérifier par l'utilisateur** (5 min) : 1) `./check.sh` vert ; 2) `cd api && uv run ffe serve --reload` puis `cd web && npm run dev`, ouvrir `http://localhost:5180` depuis Windows → « API OK » ; 3) ajouter un champ à `HealthRead` dans `api/src/ffe/api/v1/health.py`, lancer `./check.sh` → échec de `test_openapi.py` ; `uv run ffe openapi` puis `npm run gen:api` → vert ; annuler la modification.

**Reste** : accès depuis le navigateur Windows **confirmé par l'utilisateur** (« API OK » sur `http://localhost:5180`, 2026-10-09) : critère de fini atteint en entier ; pas de « Idée parquée » nouvelle. `.claude/settings.json` élargi par l'utilisateur (Claude ne peut pas modifier ses propres permissions) : `allow` large, `ask` sur `git push`/`kill`, `deny` conservé sur `rm -rf`, `git push --force`, `git clean` et `~/.persist/ffe/**`.

**Prochaine étape : 2 — Modèle de données validé (aucun code).** Décisions à poser en bloc : D2.1 à D2.7 (ROADMAP).

## 2026-10-09 — Étape 0 : outils de travail

**Fait** : dépôt `/workspaces/Perso/FFE` créé (l'ancien dossier `FF&E`, vide, reste à supprimer par l'utilisateur : `rmdir "/workspaces/Perso/FF&E"` ; puis rouvrir VS Code / Claude Code sur `FFE`), git initialisé sur `main`, documentation et configuration de collaboration écrites. Aucun code applicatif. Plan de l'étape 0 approuvé par l'utilisateur après une conception multi-agents (3 recherches, 3 stacks jugées, 3 livrables critiqués puis révisés) ; matière conservée sous `~/.persist/claude/projects/-workspaces-Perso-FF-E/…/subagents/workflows/wf_adc0dbc8-2df/journal.jsonl`.

**Cadrage validé avec l'utilisateur** (voir ADR-0001 à ADR-0005) :

- D0.1 Stack : back Python (FastAPI, SQLAlchemy 2.0.x, Alembic batch, Pydantic v2, Typer, uv) + front TypeScript (Vite 8, React 19, TS 7, TanStack Query, react-router, react-hook-form, Tailwind 4, openapi-fetch). Choisi par l'utilisateur contre un TS unique mieux noté, pour la couche migrations. — ADR-0001.
- D0.2 Emplacement : dépôt `/workspaces/Perso/FFE` (9p, visible de Windows) ; base SQLite, fichiers joints, sauvegardes vivantes sur `~/.persist/ffe/` (ext4 persistant, vérifié) ; copies vers un dossier Windows. — ADR-0002.
- D0.3 Métier : résidentiel et hôtellerie ; une zone porte un multiplicateur (défaut 1). — ADR-0005.
- D0.4 Placements : une ligne peut être placée dans plusieurs zones avec une quantité par zone (`project_item_placement`). — ADR-0005.
- D0.5 Périmètre v1 : prescription et budget (étapes 1 à 9). Devis, commandes, livraisons, factures : structure prête, livrés à l'étape 10.
- D0.6 Prix : HT saisi + taux de TVA → TTC calculé ; plusieurs devises (devise et `fx_rate_micro` figés par ligne, totaux en EUR) ; remises fournisseur en points de base. — ADR-0003, ADR-0005.
- D0.7 Marge de revente : information inconnue de l'utilisateur à ce jour → aucune colonne de vente en v1 ; chemin additif (`markup_bp`, `unit_sell_override_cents`, `setting.pricing_mode`) documenté dans ADR-0005 et DATA_MODEL §9 (ROADMAP « Reporté volontairement » y renvoie).
- D0.8 Langues : code, tables, colonnes, fichiers en anglais ; UI, docs, CLAUDE.md, commits en français. — ADR-0004.

**Défauts appliqués** (silence de l'utilisateur, chacun **défaut, à confirmer**) :

- D0.9 Catégories de départ : AS assises, TAB tables, RAN rangements, LIT literie, LUM luminaires, TXT textiles, DEC décoration, CUI cuisine, SAN sanitaire, MEN menuiserie, EQU équipement, FRA frais, DIV divers ; codes articles sur le niveau 1 (`LUM-003`). — défaut, à confirmer.
- D0.10 Dossier Windows de sauvegarde `FFE_BACKUP_DIR` = `/workspaces/Perso/FFE-sauvegardes/` (hors dépôt). — défaut, à confirmer.
- D0.11 Frais (transport, installation) : lignes forfaitaires `kind='fee'` par fournisseur, exclues du book. — défaut, à confirmer.
- D0.12 Dirigeants d'entreprise : jamais stockés lors de la future recherche d'entreprises (F3). — défaut, à confirmer.
- D0.13 CLAUDE.md rédigé en français. — défaut, à confirmer.
- D0.14 Options A/B présentées au client : hors v1, chemin additif `project_item.alternative_of_id`. — défaut, à confirmer.
- D0.15 SQLAlchemy 2.0.x au départ (2.1 plus tard), pas de SQLModel, tables STRICT, pas de CI. — défaut, à confirmer.
- D0.16 Schedules Excel existants à partager pour l'import futur (F4) : aucun fourni. — facultatif, ouvert.

**Fichiers créés** : `.gitignore`, `.gitattributes`, `.editorconfig`, `check.sh`, `.claude/settings.json`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` (brouillon, à valider à l'étape 2), `docs/API.md`, `docs/ROADMAP.md`, `docs/GLOSSARY.md`, `docs/JOURNAL.md`, `docs/decisions/README.md`, `docs/decisions/ADR-0001-stack.md`, `ADR-0002-emplacement-et-sauvegardes.md`, `ADR-0003-argent-dates-identifiants.md`, `ADR-0004-langues-et-conventions.md`, `ADR-0005-lignes-placements-prix.md`.

**Commits** : `chore: initialisation du dépôt` (commit initial de `main`, un seul pour l'étape 0 ; son hash est le premier de `git log`).

**À vérifier par l'utilisateur** (5 min) : la liste de vérification du plan (fichiers présents, un commit, ADR ≤ 25 lignes et approuvées, aucun fichier de code) ; relire les cinq ADR et les défauts D0.9 à D0.15 ; rouvrir VS Code / Claude Code sur `/workspaces/Perso/FFE`.

**Reste** : réponses aux défauts D0.9 à D0.16. Mémoire Claude Code posée (profil, cadrage, collaboration) pour les deux chemins de projet (`FF&E` et `FFE`).

**Prochaine étape : 1 — Squelette outillage.** Décisions à poser en bloc en début de session : D1.1 ports 8000 (API) / 5173 (Vite) ; D1.2 SQLAlchemy 2.0.x, pas 2.1 ; D1.3 Tailwind dès maintenant ; D1.4 uv `native-tls = true` ; D1.5 instantané `api/openapi.json` commité par `ffe openapi`, source de `gen:api` (défaut, à confirmer à l'étape 1). Défauts : oui aux cinq. Critère de fini : `./check.sh` vert, « API OK » affiché depuis le navigateur Windows, test de fraîcheur de `schema.d.ts` qui échoue quand une route change.
