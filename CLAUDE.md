# FFE — guide pour Claude Code

Outil local, mono-utilisateur, de procurement FF&E (mobilier, luminaires, équipements d'aménagement intérieur ; résidentiel et hôtellerie).
Priorité : **fiabilité**, puis **simplicité**. Rien de clever : du code court, lisible, testé.
Langues : code (identifiants, fichiers, tables, colonnes, commentaires) en **anglais** ; UI, docs, ADR, JOURNAL et commits en **français**.
Avant toute tâche : lire `docs/ROADMAP.md` (où on en est) et `docs/JOURNAL.md` (dernière session).
Avant de toucher la base ou l'API : lire aussi `docs/DATA_MODEL.md` et `docs/ARCHITECTURE.md`. Les décisions tranchées sont dans `docs/decisions/` (ADR-0001 à 0009).

## Commandes

**Étape F1 (2026-10-11) : exports xlsx (openpyxl, ADR-0009) : `GET /projects/{id}/exports/schedule.xlsx?variant=`, table `project_file` (migration 0011), liens dans l'onglet Lignes ; 10c : migration 0010 (`delivery`, `delivery_line`, `supplier_invoice`, ADR-0008), réceptions partielles → `delivered`, factures et paiements, Facturé / Payé dans le budget ; 10b : migration 0009 (`purchase_order`, `purchase_order_line`, `purchase_order_file`, `po_sequence`, ADR-0007), `services/purchase_order.py` (émettre = lignes `ordered` + `order_ref`), `money.po_line_amounts`/`po_totals`, « Engagé » dans le budget, onglet « Commandes » avec document imprimable ; 10a : migration 0008 (`quote`, `quote_line`, `quote_file`, ADR-0006), `services/quote.py` (retenir = copie sur la ligne + événement `quote` + `quoted`), onglet « Devis », comparaison dans la fiche de ligne ; 9 : migration 0007 (agence sur `setting`), `GET/PATCH /settings` + page Réglages, `POST /system/backup`, copie vérifiée vers `FFE_BACKUP_DIR`, fil horaire + sauvegarde à l'arrêt, `logs/ffe.log`, `--with-files`, `check --files`, `docs/RUNBOOK.md`, 2 parcours Playwright (`npm run e2e`) ; 8 : migration 0006 `budget_line` + `project.contingency_bp`, `services/budget.py`, onglet « Budget », `GET /dashboard` en page d'accueil, `GET /projects/{id}/alerts` ; 7c : statuts avec confirmation et note, remplacement de produit, historique, filtres serveur, « Commander avant le », impression et variante client ; 7b : onglet « Lignes » ; 7a : migration 0005, `money.py`, `transitions.py`, service des lignes, `GET /projects/{id}/summary` ; gabarit = ARCHITECTURE §9 + `services/common.py` + `pages/common/useSubmitErrors.ts`. Mode enchaîné depuis 6b : décisions par défaut consignées dans le JOURNAL, pas d'attente de validation (mémoire `feedback-mode-enchaine`).** Mettre cette liste à jour à chaque étape.
**Venv Python — règle dure pour Claude** : `api/.venv` est un lien symbolique vers `~/.venvs/ffe` (ext4 ; ARCHITECTURE §11, maître). Les shells de Claude Code héritent de `UV_PROJECT_ENVIRONMENT=~/.venvs/racoon` et `UV_FROZEN=1` (réglage utilisateur, **non neutralisé** par le bloc `env` du projet, constaté le 2026-10-10) : tout `uv run` lancé tel quel **resynchronise le venv de Racoon sur le lock de FFE**. Donc : `check.sh` exporte lui-même les bonnes valeurs, et toute commande `uv` hors `check.sh` se lance avec `UV_PROJECT_ENVIRONMENT=/workspaces/Perso/FFE/api/.venv UV_FROZEN=0 uv …` (préfixe obligatoire). Si le venv de Racoon a été touché : `cd /workspaces/Perso/Racoon && UV_PROJECT_ENVIRONMENT=~/.venvs/racoon UV_FROZEN=1 uv sync` le restaure.

```
./check.sh                         # LA porte avant commit : api (ruff format --check, ruff check, pyright, pytest) + web (npm run check)
cd api && uv run ffe serve [--reload]   # API FastAPI sur 127.0.0.1:8000 (uvicorn) ; sert web/dist/ si présent ; base de dev ~/.persist/ffe-dev (étape 3)
cd api && uv run pytest -q         # tests Python (base fichier temporaire migrée)
cd api && uv run ruff format --check . && uv run ruff check .   # format + lint (règles E9, F, I, UP)
cd api && uv run pyright           # typage strict
cd api && uv run alembic revision --autogenerate -m "<slug>"    # puis RELIRE alembic/versions/<rev>_<slug>.py ligne à ligne
cd api && uv run alembic upgrade head | check | history         # check = modèles et migrations coïncident (aussi lancé par pytest)
cd api && uv run ffe db migrate|backup [--with-files]|restore <f>|check [--files]|export-json [--with-files]|import-json <f>   # étape 3 ; migrate = backup puis upgrade puis quick_check ; `ffe db seed` (étape 6a) ; options --with-files/--files (étape 9)
cd api && uv run ffe openapi       # écrit api/openapi.json (commité) depuis create_app().openapi() (étape 1)
cd web && npm run dev              # Vite 5180 (strictPort ; pas 5173, réservé à d'autres projets), host:true (visible depuis Windows), proxy /api → 127.0.0.1:8000
cd web && npm run check            # tsc --noEmit && prettier --check . && vitest run — jamais vitest en mode watch
cd web && npm run gen:api          # scripts/gen-api.ts : ../api/openapi.json → src/api/schema.d.ts, sans API lancée (après `ffe openapi`)
cd web && npm run format | build   # prettier --write . | vite build
cd web && npm run e2e              # 2 parcours Playwright (étape 9) : API jetable sur 8001 + Vite 5181, données sous ~/.persist/.ffe-tests/e2e-* ; `npm run e2e:install` après un rebuild
```

Données hors dépôt : `~/.persist/ffe/` (réel) et `~/.persist/ffe-dev/` (dev) = `ffe.sqlite` (+ `-wal`, `-shm`), `files/`, `backups/`, `logs/`, `ffe.lock`.
Variables d'environnement : `FFE_DATA_DIR` (refusé si le FS n'est pas ext4) et `FFE_BACKUP_DIR` ; liste et défauts : ARCHITECTURE §1 (maître). Choix réel/dev (D3.4) : `FFE_ENV=dev` par défaut → `~/.persist/ffe-dev` ; `--prod` sur `ffe serve` et `ffe db …` → `~/.persist/ffe`.
Le dépôt est sur 9p (`/workspaces`) : jamais une base SQLite dedans ; `uv` avec `system-certs = true` (nouveau nom de `native-tls`) ; `vitest run` et `pytest` sans watch.

## Avant de committer

1. `./check.sh` vert, lancé depuis la racine. Pas de commit sur un check rouge ou « presque vert ».
2. Migration nouvelle : fichier relu ligne à ligne, additive seulement (CREATE TABLE, CREATE INDEX, ADD COLUMN nullable ou avec défaut) ; `alembic check` passe ; test de rejeu sur base vide passé. Recréation de table (batch) : règle d'ARCHITECTURE §5 (ajout d'une valeur à un CHECK sans ADR, relue ; toute autre recréation = ADR d'abord).
3. `docs/DATA_MODEL.md` mis à jour si une table change ; `docs/API.md` si une route change ; `docs/ROADMAP.md` coché si l'étape est finie ; `docs/JOURNAL.md` toujours.
4. Commit conventionnel en français, un par tâche : `feat|fix|refactor|docs|test|chore(scope): …` (scopes : `api`, `web`, `db`, `docs`, `repo`). Jamais `git push --force`, jamais `git add -A` sans relire `git status`.
5. Aucun fichier de données, `.env`, `*.sqlite*`, `node_modules`, `.venv` dans le commit (voir `.gitignore`).

## Tests

Ce qui est prouvé par couche, fichiers et étapes : ARCHITECTURE §7 (maître). Règles :

- Chaque test de base ouvre **son propre fichier temporaire migré** (`conftest.py`) ; **jamais la base réelle ni `~/.persist/ffe`** ; fixtures et seeds au format export JSON ; factories via les services, jamais en SQL direct ; pas de mock de SQLite.
- Toute nouvelle formule de `money.py` = cas de référence au centime écrit avant le code ; toute nouvelle contrainte = cas d'intégrité qui la fait lever.
- Nommage : `test_<module>.py` / `test_api_<resource>.py` côté Python (dont `test_openapi.py`, fraîcheur du contrat) ; côté front, `<Component>.test.tsx` à côté du composant, tests transverses (`schema-freshness.test.ts`, `boundaries.test.ts`) dans `web/tests/`. Un test = un comportement, nommé par le comportement attendu (`test_ordered_to_draft_is_refused`).
- `TestClient` sur `create_app(deps)` avec horloge injectée ; par ressource : 201 + relecture, PATCH partiel, 422 champ par champ, 404, 409, archive/désarchive.

## Carte du code (arborescence prévue ; étape 1 = squelette `api/` et `web/`)

```
CLAUDE.md · README.md · check.sh · .claude/settings.json · .gitignore · .gitattributes · .editorconfig   # étape 0
docs/        ARCHITECTURE · DATA_MODEL · API · ROADMAP · GLOSSARY · JOURNAL · RUNBOOK (étape 9) · decisions/ADR-NNNN-*.md
api/         étape 1, projet uv : src/ffe/ (config, app, main, cli, api/v1/{router,health}) · tests/ · openapi.json ; étape 3 : deps, db/{engine,fs_check,lock,migrate,startup,backup,json_io}, models/{base,setting,client}, schemas/{base,health}, alembic/, .env.example ; étape 4 : errors, i18n/fr.py, api/handlers, schemas/client, services/{base,client}, api/v1/client ; étape 6a : db/seed, models/{category,manufacturer,supplier}, schemas/{category,manufacturer,supplier}, services/{common,category,manufacturer,supplier}, api/v1/{category,manufacturer,supplier}, alembic/versions/0002 ; étape 6b : models/{file,product,product_file}, schemas/{file,product}, services/{file,product}, api/v1/{file,product}, alembic/versions/0003 ; étape 6c : models/{project,zone}, schemas/{project,zone}, services/{project,zone}, api/v1/{project,zone}, alembic/versions/0004 ; étape 7a : money, transitions, models/{project_item,project_item_placement,project_item_event,code_sequence,project_item_file}, schemas/project_item, services/project_item, api/v1/project_item, alembic/versions/0005
web/         étape 1, paquet npm : src/ (api/{schema.d.ts, client.ts, queries/health.ts}, pages/HealthPage.tsx, main.tsx, styles.css) · scripts/gen-api.ts · tests/ ; étape 5 : api/errors.ts, api/queries/client.ts, routes.tsx, components/{Layout, ui/{Button,Toast,ConfirmDialog,EmptyState}, forms/{Form,Field,TextInput,TextArea,Select,BpField}, tables/DataTable}, pages/clients/{ClientsPage,ClientForm,ClientEditPage}, tests/helpers/{fakeApi,render}, tests/setup.ts ; étape 6a : api/queries/{supplier,manufacturer,category}, ui/Pagination, pages/common/useSubmitErrors, pages/{suppliers,manufacturers,categories}/ ; étape 6b : forms/{MoneyField,DateField,EntityPicker}, api/queries/product, pages/products/ ; étape 6c : api/queries/project, pages/projects/{ProjectsPage,ProjectForm,ProjectEditPage,ZonesTab} ; étape 7b : forms/QuantityField, api/queries/projectItem, pages/projects/{ItemsTab,ItemPanel}
extension/   étape F6 seulement ; n'existe pas avant
```

Arborescence détaillée, étape de naissance de chaque fichier et nommage : `docs/ARCHITECTURE.md` §2 (maître, ne pas recopier ici). Un module par table, nom singulier = nom de la table : `models/client.py`, `schemas/client.py`, `services/client.py`, `api/v1/client.py`, `services/project_item.py`.
Flux d'une requête : page → `queries/<resource>.ts` → `client.ts` (openapi-fetch, types générés) → `/api/v1/<resource>` → routeur (schéma Pydantic in) → service (transaction, règles, événements, `money.py`) → modèles → DTO Pydantic out (camelCase) → TanStack Query → page.
Checklist « ajouter une ressource » (détail dans `docs/ARCHITECTURE.md` §9) : modèle + migration relue → schémas in/out → service → routeur + erreurs → tests API → `uv run ffe openapi` puis `npm run gen:api` → queries → page + formulaire → `docs/API.md` et `DATA_MODEL.md`.

## Règles dures

- **Pas de code pour plus tard** : aucune table, colonne, dossier, route, composant ou dépendance qui n'est pas utilisé et testé dans l'étape en cours ou dans l'étape suivante nommée dans `ROADMAP.md` (ex. tables de l'étape 3 servies par l'API de l'étape 4). Les accroches futures restent dans `docs/DATA_MODEL.md` §9 et `ROADMAP.md` (« Idées parquées »).
- **Un fait = un document maître** ; les autres le citent (`ARCHITECTURE §5`) sans le recopier. Maîtres : arborescence, variables d'environnement, cycle de démarrage, pragmas, sauvegardes, tests → `ARCHITECTURE.md` ; tables, statuts, formules, accroches futures → `DATA_MODEL.md` ; routes → `API.md` ; décisions → `docs/decisions/`.
- Une étape à la fois (`docs/ROADMAP.md`). Un besoin hors étape va dans « Idées parquées », pas dans le code.
- Données vivantes (base, WAL, fichiers joints, verrou) uniquement sous `FFE_DATA_DIR` sur **ext4** (`~/.persist/…`) ; refus de démarrer sinon (lecture de `/proc/mounts`). Jamais `/workspaces`, `/mnt`, ni l'overlay. Copies de sauvegarde terminées : `FFE_BACKUP_DIR`.
- Cycle de démarrage, pragmas et sauvegardes : ARCHITECTURE §5 (maître). Règles dures : tout échec du cycle = arrêt sans servir, base intacte ; SQLite ≥ 3.37 ; jamais copier `ffe.sqlite` à chaud (`sqlite3.Connection.backup()` uniquement, puis `quick_check` du fichier produit).
- Migrations : une par étape, relue ligne à ligne, **additive seulement** ; jamais d'autogénération non relue ; jamais éditer une migration appliquée ; `alembic check` en test ; backup automatique avant chaque `upgrade` ; historique immuable dès la première donnée réelle (étape 6a). Détail (batch, index d'expression, STRICT) : ARCHITECTURE §5.
- Argent : `*_cents INTEGER` HT + `currency` TEXT ISO 4217 ; taux en points de base `*_bp INTEGER` (10 000 = 100 %) ; quantités `qty_milli INTEGER` ; change `fx_rate_micro INTEGER` (1 unité = `fx_rate_micro`/1 000 000 EUR ; 1 000 000 pour l'EUR), figé par ligne. Jamais de REAL, jamais de float en Python pour un montant.
- **Tous les calculs dans `api/src/ffe/money.py`** (entiers, arrondi au centime à chaque étape de la formule). Rien de calculé n'est stocké ; **zéro vue SQL**, zéro somme en SQL ; le front n'additionne jamais, il affiche les DTO.
- Pas de marge ni de prix de vente en v1 (ADR-0005) ; multi-devises dès la v1 ; totaux et budgets en EUR net HT.
- Invariants dans la base : tables **STRICT**, `CHECK` (statuts, `≥ 0`, formats SIREN 9 / SIRET 14 chiffres, `multiplier ≥ 1`), `UNIQUE` métier ; jamais de colonne nullable dans un `UNIQUE` sans `COALESCE` ou `WHERE` explicite. Tables au singulier, snake_case, `id INTEGER PRIMARY KEY` ; `*_at` ISO-8601 UTC posé par le service, `*_on` = `YYYY-MM-DD`.
- FK `ON DELETE RESTRICT` par défaut ; `CASCADE` seulement pour les enfants stricts (placements, événements, fichiers de jointure).
- Archiver (`archived_at`), ne pas supprimer. Suppression physique bornée : brouillon sans événement, zone vide, placement, ligne de budget, fichier sans plus aucune jointure.
- Prix d'une ligne (`project_item`) = copie **figée** (coût, devise, taux, remise, TVA, fournisseur) ; tout changement de statut écrit `project_item_event` dans la même transaction ; prix, remise, devise, taux, produit, quantité et placement sont journalisés à partir de `approved` (ADR-0005, DATA_MODEL §4.13). `approved` pose le snapshot `approved_unit_net_cents` + `approved_total_qty_milli`. `code_sequence` jamais décrémenté.
- Statuts d'une ligne : `draft → specified → quoted → approved → ordered → delivered → installed`, plus `cancelled` et `replaced` ; libres avec confirmation jusqu'à `ordered`, puis retour impossible sauf `cancelled` avec note ; `ordered` exige `order_ref`. `cancelled`/`replaced` non comptés ; `kind='existing'` compté en quantité, exclu des montants ; `kind='fee'` (frais forfaitaires par fournisseur) exclu du book.
- Quantité totale d'une ligne = Σ (`qty_milli` du placement × `multiplier` de la zone) ; une ligne garde un seul `item_code` (`<CAT>-NNN`, préfixe = catégorie de niveau 1) même placée dans plusieurs zones.
- Toute écriture passe par un service, dans une transaction (`with session.begin()`) ; les routeurs ne touchent jamais la session directement ; le module `db/` est le seul à parler à `sqlite3`/engine.
- API : préfixe `/api/v1`, JSON **camelCase** (alias Pydantic, aucun mapping manuel), erreurs typées `{code, message, details[{field, message}]}` ; 422 champ par champ, 404 cohérents, 409 avec `archivedId` sur doublon archivé ; jamais de 500 silencieux ; pas de pagination, sauf les trois listes du catalogue (`/products`, `/suppliers`, `/manufacturers` : `?q=&limit=50&offset=0`, réponse `{items, total}`, cf. `docs/API.md` §Listes).
- Serveur à l'écoute de **`127.0.0.1:8000` seulement** ; Vite proxifie `/api`. Le front n'appelle **jamais** un service externe ; toute intégration future passe par le back.
- Front : TypeScript strict, pas d'`enum`, pas de `any` ; types API uniquement depuis `src/api/schema.d.ts` généré (jamais de type API écrit à la main) ; `schema.d.ts` régénéré et commité à chaque changement de route.
- Messages serveur (erreurs, libellés d'enums) dans `api/src/ffe/i18n/fr.py`, jamais en dur dans un routeur ou un service. Côté front, application mono-langue : textes français écrits dans les composants (ROADMAP D5.4), pas de couche i18n.
- Pas de nouvelle dépendance (`uv add`, `npm install`) sans ligne dans l'ADR concerné ; question de conception → ADR (≤ 25 lignes, gabarit `docs/decisions/README.md`) avant le code.
- Dirigeants d'entreprise : jamais stockés. Pas de scraping ni de copie de catalogues, ni de capture en masse : import des tarifs fournis, « coller une URL » et extension à la demande seulement (plan validé le 2026-10-09 ; ROADMAP F4–F6).

## Réutiliser d'abord

`money.py` pour tout calcul (jamais une multiplication locale) ; `transitions.py` pour tout changement de statut ; `schemas/` Pydantic existants avant tout nouveau type ; `services/<table>.py` pour toute écriture (journal garanti), `services/project_item.py` pour toute ligne ; `ffe/errors.py` pour toute erreur ; `db/json_io.py` pour tout import/export ; `tests/conftest.py` et ses factories pour tout test ; côté front `components/forms/*` pour tout champ, `components/tables/DataTable` pour toute liste, `api/queries/<table>.ts` pour tout appel. Vérifier l'existant (`grep`) avant de créer un module.

## Collaboration

- **Une étape à la fois**, dans l'ordre de `docs/ROADMAP.md`. Une étape = une session courte : fichiers + `./check.sh` vert + commit(s) conventionnel(s) + compte rendu.
- **Début d'étape** : relire `ROADMAP.md` et `JOURNAL.md` ; poser **toutes** les décisions de l'étape en **un seul bloc numéroté** (question, recommandation, défaut) ; attendre la réponse. « défaut » ou silence = défaut appliqué, noté comme tel dans `JOURNAL.md`.
- **Fin d'étape** : compte rendu ≤ 10 lignes (fait / décisions prises / commits / 3 vérifications que l'utilisateur peut faire en 5 min / reste ou parqué), copié tel quel dans `docs/JOURNAL.md` ; `ROADMAP.md` coché avec la date et le commit.
- **Ne jamais redemander une décision tranchée** : citer l'ADR (`ADR-0003 §Décision`) ou le paragraphe du JOURNAL. Une décision à revoir = nouvelle ADR qui remplace l'ancienne, pas une discussion.
- Ne jamais inventer un fait technique ; si un détail manque, l'écrire « à trancher à l'étape N » et le mettre dans le bloc de décisions de cette étape.
- Scripts jetables, essais, exports de debug : dans le scratchpad de la session, **jamais dans le dépôt**. Captures d'écran et essais navigateur : seulement si l'utilisateur les demande.
- Pas de CI, pas de hooks git : `./check.sh` est la seule porte. Pas de refactor opportuniste hors du périmètre de l'étape.
- S'adresser à l'utilisateur en français, sobrement ; dans les docs, style impersonnel.
