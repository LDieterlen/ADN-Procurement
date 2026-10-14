# Architecture

Outil local, mono-utilisateur, de procurement FF&E. Trois couches, deux sous-projets, un seul fichier de données. Ce document décrit la cible ; à l'étape 1 (2026-10-09) seuls le squelette d'`api/` et de `web/` existent (santé, CLI `serve`/`openapi`, page « API OK », contrat généré). Chaque dossier porte l'étape où il naît (voir `ROADMAP.md`). Décisions de fond : `decisions/ADR-0001` à `ADR-0005`.

## 1. Vue d'ensemble

| Couche | Technologie | Sous-projet | Rôle |
|---|---|---|---|
| Base | SQLite ≥ 3.37 (stdlib Python), tables STRICT, WAL | `api/` | Seule vérité ; invariants dans le schéma (CHECK, UNIQUE, FK) |
| Back | Python 3.14, FastAPI, SQLAlchemy 2.0.x, Alembic (batch), Pydantic v2, Typer | `api/` (projet uv) | API `/api/v1` sur `127.0.0.1:8000`, CLI `ffe`, migrations, sauvegardes |
| Front | Vite 8, React 19, TypeScript 6 strict (repli d'ADR-0001 appliqué à l'étape 1 : openapi-typescript exige l'API JS du compilateur, absente de TS 7 ; JOURNAL D1.6), TanStack Query 5, react-router 7, react-hook-form, Tailwind 4, openapi-fetch | `web/` (paquet npm) | Écrans de saisie ; n'additionne jamais, n'appelle jamais un service externe |

Deux sous-projets, aucun outil de workspace : `api/` a son `pyproject.toml` et son `uv.lock`, `web/` son `package.json` et son `package-lock.json`. Le contrat entre les deux est le document OpenAPI produit par FastAPI (§4).

Deux modes d'exécution :

| | Développement | Usage réel |
|---|---|---|
| Processus | Deux : `uv run ffe serve --reload` (API) et `npm run dev` dans `web/` (Vite) | Un : `uv run ffe serve` |
| Ports | API `127.0.0.1:8000` ; Vite `5180` (`strictPort`, hors du 5173 par défaut pour ne jamais entrer en collision avec un autre projet) avec `server.host: true` et proxy `/api` → `127.0.0.1:8000` | `127.0.0.1:8000` |
| Front | Servi par Vite (HMR) | `web/dist/` (produit par `npm run build`) servi en statique par FastAPI, repli `index.html` |
| Base | `~/.persist/ffe-dev/` | `~/.persist/ffe/` |
| URL dans le navigateur Windows | `http://localhost:5180` | `http://127.0.0.1:8000` |
| Badge « BASE DE DEV » | Affiché (`health.isDevDb = true`) | Absent |

Sélection de la base (D3.4, tranché à l'étape 3) : `FFE_ENV=dev` implicite → `~/.persist/ffe-dev` ; `--prod` sur `ffe serve` et sur chaque `ffe db …` → `~/.persist/ffe`, afin qu'aucune commande lancée par réflexe ne touche les données réelles. `FFE_DATA_DIR` surcharge explicitement le dossier (refusé hors ext4).

### CLI `ffe` (Typer, `api/src/ffe/cli.py`)

| Commande | Étape | Rôle |
|---|---|---|
| `ffe serve [--reload] [--prod]` | 1 | Cycle de démarrage (§5) puis uvicorn sur `127.0.0.1:8000` |
| `ffe openapi` | 1 | Écrit `api/openapi.json` depuis `create_app().openapi()` (instantané commité : défaut, à confirmer à l'étape 1, D1.5) |
| `ffe db migrate` | 3 | `backup()` → `alembic upgrade head` → `foreign_key_check` → `quick_check` |
| `ffe db backup [--label x] [--with-files]` | 3 | Sauvegarde locale + `quick_check` + rotation (étape 3) ; étape 9 : copie séquentielle vers `FFE_BACKUP_DIR`, `quick_check` de la copie, même rotation ; `--with-files` synchronise `files/` vers `FFE_BACKUP_DIR/files/` (ajout seulement) |
| `ffe db restore <fichier>` | 3 | Vérifie, sauvegarde l'actuelle, remplace (serveur arrêté) |
| `ffe db check [--files]` | 3 | `integrity_check`, `foreign_key_check`, liste des tables avec leur drapeau STRICT (lu dans `sqlite_master.sql`), comptages, orphelins de fichiers ; `--files` (étape 9) recalcule le sha256 de chaque fichier joint |
| `ffe db export-json [sortie] [--with-files]` · `ffe db import-json <fichier> [--replace]` | 3 | Copie lisible indépendante du format, et son retour ; `--with-files` (étape 9, sortie obligatoire) copie `files/` dans `<dossier de sortie>/files/` |
| `ffe db seed` | 6a | Catégories de départ dans une base vide (dev) |

Variables d'environnement (lues par `config.py` via pydantic-settings, préfixe `FFE_`, aucune n'est obligatoire ; ce paragraphe est le maître) : `FFE_HOST` (`127.0.0.1`) et `FFE_PORT` (`8000`), `FFE_WEB_DIST` (dossier statique servi en usage réel, défaut `web/dist/`) — étape 1 ; `FFE_DATA_DIR` (surcharge du dossier de données, refusé hors ext4), `FFE_BACKUP_DIR` (défaut `/workspaces/Perso/FFE-sauvegardes/`, absent = avertissement) ; `FFE_ENV` (`dev` par défaut ; `--prod` le force à `prod`) — étape 3 (D3.4) ; `FFE_DEV_CONTACTS_CSV` (dev seulement : annuaire réimporté par `reset-dev`, défaut `references/ANNUAIRE FUSION.csv`, ignoré si absent) — 2026-10-13. Aucun `.env` versionné ; `api/.env.example` documente les noms retenus.

## 2. Arborescence cible

```
/workspaces/Perso/FFE/                      # dépôt git, montage 9p (code seulement, jamais de données)
├── CLAUDE.md · README.md · check.sh        # étape 0
├── .gitignore · .gitattributes · .editorconfig · .claude/settings.json   # étape 0
├── docs/                                   # étape 0 : ARCHITECTURE, DATA_MODEL, API, ROADMAP, GLOSSARY, JOURNAL
│   ├── decisions/                          # étape 0 : gabarit + ADR-0001..0005
│   └── RUNBOOK.md                          # étape 9 : procédures (restauration, perte de base, déplacement)
├── api/                                    # étape 1 : projet uv
│   ├── pyproject.toml · uv.lock · .python-version · README.md
│   ├── .env.example                        # étape 3 : noms des variables FFE_* (jamais chargé automatiquement)
│   ├── alembic.ini · alembic/env.py        # étape 3 : render_as_batch, compare_type, naming_convention ; env.py accepte une connexion injectée (ffe.db.migrate) ou ouvre la base de config.py (CLI alembic)
│   ├── alembic/versions/                   # étape 3 ; ADR-0012 : `0001_initial.py` unique, régénérée depuis les modèles jusqu'à la v1
│   ├── openapi.json                        # étape 1 : instantané du contrat, commité, testé (§4)
│   ├── src/ffe/
│   │   ├── config.py                       # étape 1 : pydantic-settings (FFE_DATA_DIR, FFE_BACKUP_DIR, FFE_ENV, port) ; étape 3 : chemins dérivés (db_path, backups_dir, lock_path)
│   │   ├── deps.py                         # étape 3 : Deps (settings, engine, horloge, callbacks d'arrêt) + get_deps (dépendance FastAPI) ; module séparé d'app.py pour éviter l'import circulaire avec les routeurs ; étape 9 : RuntimeStatus (dernier quick_check, chemin du journal)
│   │   ├── logs.py                         # étape 9 : configure_logging(logs_dir) → logs/ffe.log (RotatingFileHandler 5 Mo × 2)
│   │   ├── app.py                          # étape 1 : create_app(deps) sans E/S au chargement ; statique web/dist ; étape 9 : middleware « une ligne de journal par requête »
│   │   ├── main.py                         # étape 1 : point d'entrée uvicorn ; étape 3 : exécute le cycle de démarrage §5 à l'import, SystemExit(1) sans servir en cas d'échec ; étape 9 : journal, BackupScheduler, sauvegarde à l'arrêt
│   │   ├── cli.py                          # étape 1 : Typer `ffe serve|openapi` ; étape 3 : `ffe db …`
│   │   ├── money.py                        # étape 7a, réduit étape 12 : div_round demi-supérieur, net, net EUR, quantité totale, total HT, part d'implantation, share_bp, alert_level, rangs de statut ; prouvé par tests/test_money.py
│   │   ├── captures/extract.py             # étape F5 (ADR-0014) : extraction générique d'une page produit (JSON-LD → OpenGraph → titre), stdlib, aucune règle par site
│   │   ├── demo.py                         # étape 12 : `ffe db seed --demo`, projet d'exemple construit par les services (jamais en SQL)
│   │   ├── errors.py                       # étape 4 : AppError → {code, message, details} (racine du paquet : importable par services/ et api/)
│   │   ├── i18n/fr.py                      # étape 4 : messages d'erreur et libellés d'enums en français
│   │   ├── db/                             # étape 3
│   │   │   ├── engine.py                   #   create_engine + event connect → pragmas
│   │   │   ├── fs_check.py                 #   Linux : /proc/mounts, refus hors ext4 ; macOS : disque du Mac hors dossiers synchronisés (ADR-0019)
│   │   │   ├── lock.py                     #   verrou mono-instance (ffe.lock)
│   │   │   ├── startup.py                  #   cycle de démarrage §5
│   │   │   ├── backup.py                   #   backup(), quick_check, rotation, restore() ; étape 9 : copy_to_backup_dir(), sync_files(), backup_and_copy(), needs_backup()
│   │   │   ├── scheduler.py                #   étape 9 : BackupScheduler (fil horaire, règle 24 h ; tick(modified_rule) à l'arrêt)
│   │   │   ├── migrate.py                  #   Alembic programmatique : head_revision, current_revision, has_pending, upgrade_head, downgrade_base, check
│   │   │   ├── json_io.py                  #   export_json() / import_json()
│   │   │   └── seed.py                     #   types de produit de départ (19 codes, étape 12)
│   │   ├── models/                         # étape 3 : base.py (naming_convention), un fichier par table ; étape 12 (ADR-0013) puis ADR-0015/0016/0017 : 17 tables — setting, client, category (types, un niveau), professional (annuaire : prestation, savoir-faire, deux contacts ; ADR-0015), supplier (savoir-faire, deux contacts), file, capture, project, project_indice (déclarations d'indice), location (zone, niveau, multiplicateur), project_item (fiche autonome, statut unique), project_item_placement, project_item_event, item_code_sequence, project_item_file, budget_line (périmètres global · location · zone · family · supplier), project_file
│   │   ├── schemas/                        # étape 3 : base.py (BaseSchema camelCase), health.py ; par ressource : XxxCreate, XxxUpdate, XxxRead ; étape 12 : location.py, project_item.py (ProjectItemCreate : toute la fiche, placements), budget.py (BudgetLineIn par périmètre, ProjectSummaryRead : lines, totaux, byStatus, byLocation/Zone/Family/Type/Supplier), project.py (ProjectListRead), project_file.py
│   │   ├── services/                       # étape 4 : logique métier, transactions, journal ; common.py (get_or_404, ensure_active, archive, unarchive, check_duplicate_name, search, page) ; client, category, professional, supplier, contact_import (annuaire CSV → fournisseurs et professionnels, ADR-0015), file (store_upload, store_bytes, unlink_if_orphan, orphans, verify_hashes), project (next_code, ensure_open, change_status, budget global à la création), location (code unique, reorder, delete si vide) ; étape 12 : project_item.py (fiche saisie, codes `<LOC>-<TYPE>-NN` / `FR-NN`, implantations, statut libre journalisé, suppression bornée, fichiers), budget.py (put_budget_lines par périmètre, summary : totaux, parts par état, compilations par axe, filtres), project_file.py (issue_sheets avec stamp_indices, issue_list, list_exports) ; étape F5 : capture.py (preview, store_image, fetch_url = seul accès réseau sortant, injecté par `Deps.fetch_url` ; F6 : create_capture, attach_capture_image, list/delete, require_extension_token)
│   │   ├── i18n/fr.py                      # libellés des statuts, familles, usages, messages d'erreur
│   │   ├── exports/                        # étape F1 : schedule_xlsx.py (openpyxl, valeurs seulement, une ligne par placement, feuilles Schedule · Budget · Projet) ; étape F2 : pdf.py (Jinja2 + WeasyPrint, textes français des montants), book_pdf.py, po_pdf.py, templates/{base,book,po}.html ; assets/ : polices OFL (Playfair Display, IBM Plex Sans, IBM Plex Mono) et logo, embarqués pour le rendu hors ligne (2026-10-13)
│   │   └── api/v1/                         # router.py, health.py, client.py, supplier.py, professional.py, category.py, file.py, project.py (liste avec budget, prescrit, nombre d'articles), location.py, project_item.py, budget.py (`budget-lines`, `summary`), export.py (`sheets.pdf`, `list.pdf`, liste), capture.py (`/captures/preview`, `/captures/image`, boîte de réception `/captures` avec `X-FFE-Token`), setting.py, system.py
│   └── tests/                              # étape 1 : conftest.py ; étape 3 : test_startup, test_integrity,
│                                           #   test_migrations, test_backup ; étape 4+ : test_api_<ressource>
├── web/                                    # étape 1 : paquet npm
│   ├── e2e/                                # étape 9 : prescription.spec.ts (étape 12 : type → client → projet avec budget → localisation ×12 → article → prix → 5 400 € → fiches PDF), sauvegarde.spec.ts ; start-api.mjs (API jetable sur 8001, données sous ~/.persist/.ffe-tests/e2e-*) ; `npm run e2e`
│   ├── package.json · package-lock.json · tsconfig.json · vite.config.ts · vitest.config.ts · playwright.config.ts · .prettierrc · .prettierignore
│   ├── index.html
│   ├── scripts/gen-api.ts                  # étape 1 : openapi.json → schema.d.ts (exécuté par Node 24, partagé avec le test de fraîcheur)
│   ├── src/
│   │   ├── main.tsx · routes.tsx · styles.css   # refonte 2026-10-13 (references/Model site, hors dépôt) : tokens `@theme` (paper, surface, line, ink, accent, ok/warn/danger), Geist servie depuis `public/fonts/` (OFL), classe `control` pour tout champ ; étape 12 : pages `/projects`, `/projects/new`, `/projects/:id`, `/projects/:id/edit`, `/projects/:id/budget`, `/projects/:id/items/:itemId`, référentiel, `/settings`, `/health` ; fond blanc, `@media print`
│   │   ├── components/ui/{Card,Pill,Segmented,Modal}.tsx   # refonte 2026-10-13 : Card `padding` form · table, PageHeader (fil, titre 28 px, méta avec Dot), Pill `status` (palette par statut article / projet, indice), Segmented (filtres) ; étape 12 : carte à bord fin + PageHeader (titre, fil d'Ariane, actions), pastille de statut (pleine dès Validé), modale générique rendue à côté d'un formulaire ; forms/Field.tsx : `FieldIdContext` + `useFieldId`, EntityPicker `onCreate`
│   │   ├── api/queries/{project,projectItem,budget,projectFile}.ts   # étape 12 : localisations, articles (libellés des statuts, familles, usages), budget (useProjectSummary avec filtres, usePutBudgetLines, toBudgetLineIn), exports PDF
│   │   ├── api/schema.d.ts                 # étape 1 : GÉNÉRÉ par openapi-typescript, jamais édité
│   │   ├── api/client.ts                   # étape 1 : seul import d'openapi-fetch
│   │   ├── api/errors.ts                   # étape 5 : ApiError typée {status, code, details, existingId, archivedId}, unwrap()
│   │   ├── api/queries/                    # hooks TanStack Query par ressource ; client.ts porte call() (panne réseau → ApiError.network()) ; health.ts, setting.ts, system.ts, category.ts, supplier.ts, professional.ts, file.ts (upload multipart construit à la main, URL de contenu)
│   │   ├── pages/                          # HealthPage ; clients/{ClientsPage, ClientForm, ClientEditPage} ; common/useSubmitErrors.ts ; suppliers/{SuppliersPage (filtre savoir-faire), SupplierForm (nom, savoir-faire, site, représentant + portable, contact 2 ; devise masquée, pas de remise), SupplierEditPage} ; professionals/{ProfessionalsPage (prestation en pastille, savoir-faire, contact ; filtres prestation et savoir-faire), ProfessionalForm (nom, prestation, savoir-faire, deux contacts, site, notes), ProfessionalEditPage} ; categories/{CategoriesPage (types de produit), CategoryEditPage} ; settings/SettingsPage (agence, préfixe, sauvegardes) ; étape 12 : projects/{ProjectsPage (Projet · Client · Statut · Échéance · Budget · Prescrit · Articles), ProjectForm, ProjectEditPage (création avec « Nouveau client »), ProjectPage (en-tête avec statut, BudgetStrip, LocationsSection, ItemsSection, documents émis, liens Fiches PDF · Listing PDF · Budget · Modifier), LocationsSection (table + ajout en bas, réordonner, archiver, supprimer), ItemsSection (groupé par localisation : photo · code · type · désignation · qté × nombre · fournisseur · montant HT par implantation · état · indice ; bouton « + Ajouter un article »), ItemForm (champs partagés : fiche + budget, `fromItem`, `fromProduct`, `toCreatePayload`, `toUpdatePayload`), ItemNewPage (`/projects/:id/items/new` : « Coller une adresse », fiche, photo avant création, première implantation), StatusSelect (statut en place, note facultative à l'annulation), ItemPage (photo et dessin, fiche + budget en un formulaire, fournisseur créable en place, PlacementsCard, historique, suppression), ItemFiles, BudgetStrip (Budget · Prescrit · Devisé · Validé · Reste, budget global éditable), BudgetPage (répartition par état, compilation par axe avec prévisionnel éditable, filtres), InlineCreate (modales client / fournisseur)}
│   │   ├── components/PendingPhoto.tsx     # photo choisie avant la création (lue sur la page ou déposée), jointe par la page après « Créer »
│   │   ├── components/UrlCaptureBox.tsx    # étape F5 : « Coller une adresse » (lecture par le serveur, aperçu, « Utiliser » télécharge la photo) ; posé sur ItemNewPage et ProductEditPage (création)
│   │   ├── components/Layout.tsx           # étape 12 : barre haute (FF&E · Projets · Clients · Fournisseurs · Professionnels · Types · Réglages), badge « base de dev », Outlet dans un conteneur de 72 rem
│   │   └── components/{ui,forms,tables}    # étape 5 : ui/{Button, Toast (ToastProvider + useToast), ConfirmDialog (1 à 3 actions), EmptyState} ; forms/{FilterSelect (menu de filtre des listes, 2026-10-13), Form (FormProvider + bandeau), Field (label + erreur), TextInput, TextArea, Select, BpField (points de base ↔ pourcentage, entier seulement)} ; tables/DataTable (colonnes à render, ligne cliquable, état vide) ; étape 6a : ui/Pagination ; étape 6b : forms/{MoneyField (centimes ↔ « 1 250,00 »), DateField, EntityPicker (sélecteur d'entité : `<select>` natif sous 30 options, sinon combobox ARIA — une case de recherche qui ouvre la liste filtrée, Entrée ou clic choisit, croix efface ; « + Nouveau » à côté)} ; étape 7b : forms/QuantityField (millièmes ↔ « 12,5 », mode compact)
│   ├── tests/                              # schema-freshness.test.ts, boundaries.test.ts ; setup.ts ; helpers/{fakeApi.ts (faux serveur en mémoire : 422 par champ, 409 doublon/archivé, 404, archive, codes FF&E, article libre ajouté au catalogue, synthèse avec les formules de money.py), render.tsx} ; composants : src/**/<Composant>.test.tsx
│   └── dist/                               # build, ignoré par git
└── extension/                              # étape F6 (ADR-0017) : manifest.json (MV3, sans build), popup.html/js (lit la page affichée, POST /captures, envoie l'image si le serveur n'a pas pu), options.html/js (adresse de l'API, jeton), README.md (installation « non empaquetée »)
```

Nommage des modules (maître) : un module par table, nom singulier = nom de la table, dans chaque couche : `models/client.py`, `schemas/client.py`, `services/client.py`, `api/v1/client.py`, `web/src/api/queries/client.ts` ; `services/project_item.py` pour les lignes. Les URL restent au pluriel (`/clients`, `API.md`).

Hors dépôt : `~/.persist/ffe/{ffe.sqlite, files/, backups/, logs/, ffe.lock}` (réel), `~/.persist/ffe-dev/` (dev), `FFE_BACKUP_DIR` (défaut `/workspaces/Perso/FFE-sauvegardes/`, disque Windows). Non créés avant leur étape : `integrations/`, `captures/`, `extension/`, `desktop/`. Retirés par ADR-0013 (tag `v0-complet`) : `imports/`, `transitions.py`, les modules devis / commandes / réceptions / factures.

## 3. Flux d'une requête

```
page (React)                      web/src/pages/
  → hook useXxx()                 web/src/api/queries/   (TanStack Query, clé ['clients', id])
  → client openapi-fetch          web/src/api/client.ts  (types de schema.d.ts, baseUrl '/api/v1')
  → HTTP (proxy Vite en dev)
  → routeur FastAPI               api/src/ffe/api/v1/client.py    (0 logique ; dépendances : session, settings)
  → schéma Pydantic d'entrée      api/src/ffe/schemas/client.py   (422 champ par champ)
  → service                       api/src/ffe/services/client.py  (transaction, règles, journal, horodatages)
  → modèles SQLAlchemy            api/src/ffe/models/client.py
  → SQLite                        ~/.persist/ffe[-dev]/ffe.sqlite (CHECK, UNIQUE, FK levés ici)
  ← DTO Pydantic de sortie        XxxRead (camelCase par alias_generator)
  ← JSON → TanStack Query (cache, invalidation par préfixe) → page
```

Règles :

- Le routeur ne contient aucune logique : il reçoit une session et des réglages par dépendance FastAPI, appelle une fonction de service, renvoie son DTO. Il ne touche jamais la session lui-même.
- Toute écriture passe par **une** transaction de service (`with session.begin()`). Le service pose `created_at`/`updated_at` (horloge injectée), vérifie les règles métier (transitions, codes, snapshots) et écrit l'événement de `project_item_event` dans la même transaction. Pas de trigger SQL.
- Les erreurs métier sont des `AppError(code, message, details)` levées par les services et converties en réponse par un seul handler (`errors.py`). Les `IntegrityError` SQLAlchemy sont mappées en 409 par ce même handler (le nom de contrainte, grâce à la `naming_convention`, désigne la règle violée). Les `ValidationError` Pydantic deviennent des 422 avec `details[].field`.
- Les montants circulent en entiers (centimes, millièmes, points de base) de bout en bout ; seul `money.py` calcule, le front formate (`MoneyField`, `QuantityField`, `BpField`) et n'additionne jamais.
- Chemin d'erreur côté front : 422 → `setError` sur chaque `details[].field` + bandeau ; 409 avec `archivedId` → bouton « Restaurer » ; 404 → page introuvable ; réseau ou 500 → toast persistant et lien vers la page santé. Aucune saisie perdue sur erreur.

## 4. Contrat partagé

- **Source de vérité** : les schémas Pydantic de `api/src/ffe/schemas/`. Trois par ressource : `XxxCreate`, `XxxUpdate` (tous champs optionnels), `XxxRead` (DTO). Enums Python (`StrEnum`) exposés dans le schéma OpenAPI.
- **camelCase** en JSON par `alias_generator=to_camel` + `populate_by_name=True` sur un `BaseSchema` commun ; snake_case en Python et en SQL. Aucun mapping manuel.
- **OpenAPI** : FastAPI le produit (`/openapi.json`). `uv run ffe openapi` l'écrit dans `api/openapi.json`, commité (instantané commité : défaut, à confirmer à l'étape 1, D1.5). Un test pytest (`test_openapi.py`) échoue si `app.openapi()` diffère du fichier (fraîcheur côté API).
- **Types TS** : `npm run gen:api` dans `web/` exécute `scripts/gen-api.ts` (API d'openapi-typescript : `../api/openapi.json` → `src/api/schema.d.ts`, en-tête « GÉNÉRÉ »), sans API lancée. Un test Vitest (`schema-freshness.test.ts`) appelle la même fonction et compare au fichier (fraîcheur côté front). `schema.d.ts` n'est jamais édité à la main.
- **Client** : `openapi-fetch` typé par `schema.d.ts` ; les hooks de `queries/` sont le seul endroit qui l'appelle.
- Ordre d'une modification d'API : schéma Pydantic → `ffe openapi` → `gen:api` → front → `./check.sh`. Les deux tests de fraîcheur rendent l'oubli impossible.

## 5. Base de données

### Emplacement et refus de démarrer

- Réel : `~/.persist/ffe/ffe.sqlite` ; dev : `~/.persist/ffe-dev/ffe.sqlite` ; surcharge `FFE_DATA_DIR`. `/home/vscode/.persist` est le seul ext4 persistant du conteneur ; `/workspaces/Perso` est 9p (verrous et WAL non fiables), `/` est un overlay effacé au rebuild.
- `fs_check.py` lit `/proc/mounts`, trouve le point de montage le plus long qui préfixe le chemin résolu de `FFE_DATA_DIR`, et **refuse de démarrer** si le type n'est pas `ext4` (message : chemin, type trouvé, type attendu). Testé à l'étape 3 avec `FFE_DATA_DIR=/workspaces/x`. Sur macOS (ADR-0019, `ensure_safe_data_dir`) : le chemin résolu doit être sous le dossier personnel, hors `~/Library/Mobile Documents` et `~/Library/CloudStorage` (donc hors `/Volumes`) ; installation : `docs/INSTALL_MAC.md`, lanceur `scripts/mac/FFE.command`.
- `FFE_BACKUP_DIR` absent ou inaccessible : démarrage autorisé, avertissement persistant dans `GET /api/v1/health` et dans l'UI.

### Pragmas et verrou

Posés à chaque connexion par un événement `connect` de l'engine : `journal_mode=WAL`, `synchronous=FULL`, `foreign_keys=ON`, `busy_timeout=5000`, `trusted_schema=OFF`. Vérification `sqlite3.sqlite_version >= 3.37` (STRICT). Tables créées `STRICT` via `Table(..., sqlite_strict=True)` (SQLAlchemy 2.0.54, vérifié le 2026-10-09 ; dans une migration : `op.create_table(..., sqlite_strict=True)`). Le mode batch d'Alembic 1.20 ignore `sqlite_strict` (D3.7, constaté) : toute recréation future passe `table_kwargs={"sqlite_strict": True}` à `batch_alter_table`, et `test_migrations` prouve après chaque `upgrade head` que toutes les tables sont STRICT (`alembic_version`, table d'Alembic, est la seule exception).

Verrou mono-instance (D3.5) : `ffe.lock` dans le répertoire de données, pris par `fcntl.flock(LOCK_EX | LOCK_NB)` ; un second `ffe serve` ou toute commande `ffe db …` s'arrête avec « FFE tourne déjà ». Relâché à l'arrêt propre (lifespan FastAPI → `Started.close()`) et par le noyau si le processus meurt.

### Cycle de démarrage exact (`startup.py`, ordre immuable)

1. Charger la configuration ; `fs_check` ; créer le répertoire de données si absent.
2. Prendre le verrou mono-instance.
3. Ouvrir l'engine ; `PRAGMA quick_check` ; échec → arrêt.
4. Si des migrations Alembic sont en attente, ou si la dernière sauvegarde a plus de 24 h : `backup()` (`pre-migrate-<rev>` dans le premier cas). Première ouverture sans fichier : `skipped`.
5. `alembic upgrade head` (programmatique, même configuration que la CLI).
6. `PRAGMA foreign_key_check` (non vide → arrêt, message « restaurer `<fichier pre-migrate>` »).
7. `PRAGMA quick_check`.
8. **Avant la v1, base de dev seulement** (2026-10-13, ADR-0012) : si les modèles et le schéma diffèrent (même test qu'`alembic check`, la migration unique ayant été régénérée), `db/reset.py` sauvegarde (`pre-reset`), supprime le fichier, rejoue `0001` et ressème les types ; `devreset.py` (hors `db/`, injecté par `main.py` via `on_drift`) ajoute le projet d'exemple et l'annuaire (`FFE_DEV_CONTACTS_CSV`), puis le démarrage continue avec un avertissement dans le journal ; `ffe db reset-dev` fait la même chose à la main. Sur la base réelle : arrêt avec message, migration à la main. Puis seulement, écoute sur `127.0.0.1:8000`.
8. Arrêt (`SIGINT`/`SIGTERM`) : arrêt du fil horaire, sauvegarde si la base a changé depuis la dernière (mtime de `ffe.sqlite`/`-wal` > dernière sauvegarde) ou si > 24 h (`scheduler.tick(modified_rule=True)`), `engine.dispose()`, libération du verrou (étape 9).

Tout échec d'une étape 1–7 = arrêt sans servir, base intacte. Les tests ne passent pas par `startup.py` : `conftest.py` crée un fichier temporaire migré (§7).

### Alembic

- `env.py` : `render_as_batch=True` (SQLite ne sait pas `ALTER` une contrainte : recréation de table encadrée), `compare_type=True`, `target_metadata` avec `naming_convention` (`pk_%(table_name)s`, `fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s`, `uq_…`, `ck_%(table_name)s_%(constraint_name)s`, `ix_…`) : indispensable pour que le mode batch retrouve les contraintes à recréer.
- Règles (maître, ADR-0012) : **avant la v1, une seule migration `0001_initial.py`**, régénérée par `alembic revision --autogenerate` depuis les modèles à chaque changement de schéma, **relue ligne à ligne** (17 tables STRICT depuis ADR-0013), les quatre index d'expression (`COALESCE`, `lower`) et la ligne `setting` ajoutés à la main en fin d'`upgrade` ; la base de dev est recréée (`rm ~/.persist/ffe-dev/ffe.sqlite*`, `ffe db migrate`, `ffe db seed`). **Dès que l'utilisateur déclare la v1** : `0001_initial.py` est figée, chaque étape ajoute une migration `NNNN_<objet>` additive (`ADD COLUMN` nullable ou avec défaut), jamais modifiée une fois appliquée. Dans les deux régimes : `alembic check` en test prouve modèles = migrations ; **sauvegarde avant chaque `upgrade`** (CLI et démarrage).
- Recréation de table (batch) : autorisée sans ADR pour l'ajout d'une valeur à un CHECK, relue ; toute autre recréation = ADR d'abord.
- Données de référence (types de produit) : `ffe db seed` idempotent (`INSERT … ON CONFLICT(code) DO NOTHING`), `code` stable, `name` éditable ; `--demo` ajoute une fois un projet d'exemple par les services (`ffe/demo.py`).

### Sauvegardes

- Méthode unique, `backup.py` : `wal_checkpoint(TRUNCATE)` → `sqlite3.Connection.backup()` (stdlib, cohérent même pendant une écriture) vers `backups/tmp/` → `quick_check` du fichier produit → `rename` dans `backups/ffe-YYYYMMDD-HHMMSS[-label].sqlite` → copie séquentielle vers `FFE_BACKUP_DIR` (fiable sur 9p). **Règle dure : ne jamais copier `ffe.sqlite` à chaud** (`cp`, explorateur Windows) : le WAL contient des écritures non intégrées.
- Déclencheurs : démarrage (règle 24 h ou pre-migrate), avant `ffe db migrate`, `ffe db restore`, `ffe db import-json --replace`, à la demande (`ffe db backup`) ; étape 9 : arrêt (base modifiée ou > 24 h), fil horaire `BackupScheduler` appliquant la règle 24 h, `POST /api/v1/system/backup`, copie vérifiée vers `FFE_BACKUP_DIR` (`copy_to_backup_dir` : copie `.part`, `quick_check`, `rename`, rotation ; un échec de copie est journalisé et remonté dans la réponse, jamais fatal) (ADR-0002).
- Rotation (D3.2, `backup.rotate`) : par date calendaire, dernière sauvegarde de chacun des 14 derniers jours, des 8 dernières semaines ISO et des 12 derniers mois présents ; fichiers libellés (`pre-migrate-*`, `pre-restore-*`, `pre-import`, libellé manuel) conservés 90 jours ; même rotation dans `FFE_BACKUP_DIR` (étape 9).
- `ffe db restore <fichier>` : `quick_check` de la source, sauvegarde `pre-restore` de la base courante, remplacement atomique par `rename`, serveur arrêté (le verrou le garantit).
- `ffe db check` : `integrity_check`, `foreign_key_check`, liste des tables avec leur drapeau STRICT (lu dans `sqlite_master.sql`), comptages par table, orphelins `files/` ↔ table `file` ; `--files` recalcule le sha256 de chaque fichier joint (`services/file.verify_hashes`).

### Export / import JSON

`ffe db export-json [sortie]` écrit :

```json
{ "format": "ffe-export", "version": 1, "exportedAt": "2026-10-09T14:03:00Z",
  "schemaRevision": "0001_setting_client",
  "tables": { "setting": [...], "client": [...], "supplier": [...] } }
```

Clés camelCase (mêmes DTO que l'API), tables dans l'ordre des dépendances, ids conservés, fichiers référencés par `sha256` (`--with-files` copie `files/` à côté). `ffe db import-json <fichier>` valide chaque ligne avec les schémas Pydantic, en une transaction, `foreign_keys=ON`, dans une base vide (`--replace` avec sauvegarde préalable), et refuse un `schemaRevision` plus récent que la base. Ce format sert aussi de seed de démo et de fixture de test : il n'y a qu'un seul chemin d'import.

### Journal et logs

`logs/ffe.log` dans le répertoire de données : `logging` stdlib, rotation par taille (2 fichiers), une ligne par requête (méthode, chemin, code, durée) et chaque erreur 500 avec sa trace. `GET /api/v1/health` expose la date de dernière sauvegarde, l'état de `FFE_BACKUP_DIR`, le dernier `quick_check` (`RuntimeStatus`, posé au démarrage et à chaque sauvegarde) et le chemin du journal. Une requête qui lève une exception est journalisée deux fois : la ligne de requête (`… 500 …`) par le middleware, la trace par `internal_handler` (`test_logs.py`). Le journal métier des lignes (`project_item_event`) est dans la base, pas dans ce fichier.

## 6. Frontières d'import et tests d'architecture

| Module | Peut importer | Ne doit jamais importer |
|---|---|---|
| `money.py` | stdlib | tout le reste du paquet |
| `models/` | `sqlalchemy`, `models/base.py` | `schemas/`, `services/`, `api/`, `fastapi` |
| `schemas/` | `pydantic`, enums de `models/` | `services/`, `api/`, `sqlalchemy` |
| `services/` | `models/`, `schemas/`, `money.py`, `errors.py`, `db/` | `api/`, `fastapi` |
| `api/v1/` | `schemas/`, `services/`, `errors.py`, `fastapi` | `models/`, `sqlalchemy` |
| `db/` | `sqlalchemy`, `alembic`, `models/base.py`, `config.py` | `services/`, `api/` |
| `web/src/api/client.ts` | `openapi-fetch`, `schema.d.ts` | — (seul fichier qui connaît openapi-fetch) |
| `web/src/pages/`, `components/` | `queries/`, `components/`, `schema.d.ts` (types) | `client.ts` directement, `fetch` |

Tests d'architecture, zéro dépendance :

- Côté API, `tests/test_architecture.py` parcourt `src/ffe/` avec `ast` (stdlib), collecte les `import`/`from … import` de chaque module et vérifie la table ci-dessus. `import-linter` n'est pas ajouté tant que ce test suffit.
- Côté front, `web/tests/boundaries.test.ts` extrait les imports par regex sur le code formaté par Prettier (indépendant de l'API du compilateur, qui disparaît avec TypeScript 7) : `client.ts` seul importe `openapi-fetch` ; `pages/` et `components/` n'importent pas `client.ts` ; aucun `fetch(` hors `client.ts` ; aucune URL `http` externe dans `web/src/`.
- Garde-fou approximatif mais utile : grep des `services/` pour un `+`, `-`, `*`, `/` appliqué à un identifiant `*_cents`, `*_milli`, `*_bp` hors `money.py` ; échec = calcul hors du module unique.
- La frontière API ↔ front n'est pas un import mais un contrat : `schema.d.ts` est le seul lien, et les deux tests de fraîcheur (§4) en tiennent lieu.

## 7. Tests par couche

| Couche | Ce qui est prouvé | Fichiers |
|---|---|---|
| `money.py` | formules du plan (net, net EUR, total, parts d'implantation, parts en bp, alertes), arrondi au centime, cas de référence (lampe en 2 localisations, chambre ×12, moquette 12,5 m², GBP), propriétés hypothesis | `test_money.py` (étape 7a, réécrit étape 12) |
| Base | FK RESTRICT/CASCADE, CHECK (statuts, familles, périmètres de budget, `≥ 0`), UNIQUE partiels et d'expression, STRICT refuse un TEXT dans INTEGER, pragmas actifs | `test_integrity*.py` (étape 3, réécrits étape 12) |
| Migrations | base vide → `upgrade head` → `alembic check` ; `downgrade -1` / `upgrade head` par révision ; rejeu sur fixture JSON sans perte ; recréation batch conserve index/CHECK | `test_migrations.py` (étape 3) |
| Démarrage | refus hors ext4 ; refus par le verrou ; `quick_check` en échec → arrêt | `test_startup.py` (étape 3) |
| Sauvegardes | backup pendant écriture → `quick_check = ok` + comptages identiques ; rotation ; restore refuse un fichier corrompu | `test_backup.py` (étape 3) |
| API | par ressource : 201 + relecture, PATCH partiel, 422 `details[].field`, 404, 409 (`archivedId`, RESTRICT, même statut), archive/unarchive ; codes FF&E, article libre au catalogue, synthèse au centime (`test_api_budget.py`), fiches et listing PDF avec indices (`test_api_pdf.py`), projet d'exemple (`test_demo.py`) | `test_api_<ressource>.py` via `TestClient` (étape 4+) |
| Contrat | `openapi.json` à jour ; `schema.d.ts` à jour | `api/tests/test_openapi.py`, `web/tests/schema-freshness.test.ts` (étape 1) |
| Front | pages réelles sur la fausse API : liste des projets, page projet (localisations, ajout d'article, statut en place, bandeau budget), page article (fiche + budget, implantations, photo, fournisseur créé en place, suppression), page Budget (états, axes, prévisionnel, filtres), référentiel, réglages, erreurs 422/409 | `web/src/**/<Composant>.test.tsx`, Vitest + Testing Library (étape 5, réécrits étape 12) |
| Bout en bout | 2 parcours Playwright Chromium contre une vraie API sur données jetables (prescription : type → client → projet avec budget → localisation ×12 → article → prix 450 € → 5 400 € HT et reste 44 600 € → fiches PDF indice A ; sauvegarde : réglages → « Sauvegarder maintenant » → copie Windows vérifiée → Santé) | `web/e2e/` (étape 9), `npm run e2e`, hors `check.sh` (lance deux serveurs sur 8001 et 5181) |

Fixtures : `conftest.py` crée pour chaque test **un fichier SQLite temporaire** (jamais `:memory:` : WAL et FK doivent être réels), le migre par Alembic, injecte une horloge fixe et construit `create_app(deps)` + `TestClient`. Les factories passent par les services (journal garanti). Aucun test ne touche `~/.persist/ffe`.

## 8. Qualité

| Outil | Sous-projet | Ce qu'il vérifie | Configuration |
|---|---|---|---|
| `ruff format --check` · `ruff check` | `api/` | Format ; règles `E9, F, I, UP` (comme Racoon) | `pyproject.toml` `[tool.ruff]` |
| `pyright` | `api/` | Typage strict sur `src/`, standard sur `tests/` | `pyproject.toml` `[tool.pyright]` |
| `pytest -q` | `api/` | Tests §7 ; `alembic check` et fraîcheur d'`openapi.json` inclus | `pyproject.toml` `[tool.pytest.ini_options]` |
| `tsc --noEmit` | `web/` | TypeScript 6 strict, `noUncheckedIndexedAccess` (TS 7 dès qu'openapi-typescript s'en passe, JOURNAL D1.6) | `tsconfig.json` |
| `prettier --check .` | `web/` | `semi: false, singleQuote: true, printWidth: 160` | `.prettierrc` ; `.prettierignore` : `dist`, `src/api/schema.d.ts` |
| `vitest run` | `web/` | Tests de composants, frontières, fraîcheur de `schema.d.ts` | `vitest.config.ts` |

- `npm run check` dans `web/` = `tsc --noEmit && prettier --check . && vitest run`. Pas d'ESLint (typescript-eslint ne suit pas TypeScript 7).
- `./check.sh` à la racine enchaîne `api/` puis `web/` ; c'est la seule porte avant commit. `./check.sh web` ou `./check.sh api` ne lance qu'une partie, pour un commit qui ne touche que ce sous-projet. Pas de CI : la porte est locale. Vitest tourne avec `isolate: false` (les tests installent et restaurent leur fausse API).
- `[tool.uv] system-certs = true` dans `pyproject.toml` (proxy TLS, comme Racoon ; `native-tls` est le nom déprécié par uv 0.12).
- Pyright : `typeCheckingMode = "standard"` global et `strict = ["src"]` (pyright 1.1.414 ne reconnaît pas `typeCheckingMode` dans `executionEnvironments`).
- Toute nouvelle dépendance = une ligne dans l'ADR concerné ou dans `JOURNAL.md` ; `uv lock --upgrade` et `npm outdated` revus à chaque étape.

## 9. Checklist « ajouter une ressource »

1. `DATA_MODEL.md` : table, colonnes, contraintes, étape.
2. `models/<table>.py` : classe `Mapped[]`, contraintes nommées, STRICT.
3. `alembic revision --autogenerate -m "<objet>"`, relecture ligne à ligne, test de rejeu vert.
4. `schemas/<ressource>.py` : `Create`, `Update`, `Read`.
5. `services/<ressource>.py` : création, lecture, mise à jour, archive/unarchive, règles, journal.
6. `api/v1/<ressource>.py` : routeur mince ; enregistrement dans `router.py`.
7. `tests/test_api_<ressource>.py` + cas d'intégrité si nouvelle contrainte.
8. `uv run ffe openapi` puis `npm run gen:api`.
9. `queries/<ressource>.ts`, page, formulaire avec les champs typés existants.
10. `API.md` : routes marquées « livrée (étape N) » ; `JOURNAL.md` : compte rendu ≤ 10 lignes ; `./check.sh` ; commit.

### Anatomie d'une ressource (gabarit `client`, étape 4 — à recopier telle quelle)

| Couche | Fichier | Contenu et règles |
|---|---|---|
| Schémas | `schemas/client.py` | `ClientCreate` (champs + défauts, validateurs `strip`), `ClientUpdate` (tous optionnels ; `null` sur un champ obligatoire refusé par un validateur `mode="before"` qui lève `fr.FIELD_REQUIRED`), `ClientRead` (DTO complet, `from_attributes`). Types réutilisables en haut du module (`Name`, `Short`, `Siren`…). `BaseSchema` : alias camelCase en JSON, `model_dump()` en snake_case pour les modèles |
| Service | `services/client.py` | Fonctions `(session, …, clock)` ; chaque écriture ouvre `with session.begin()` ; `stamp(clock)` pose `created_at`/`updated_at` ; doublons par `normalize_key` (services/base.py) ; règles d'archivage ; lève `NotFoundError`, `DuplicateError`, `ArchivedDuplicateError`, `ConflictError` (`errors.py`), messages de `i18n/fr.py` |
| Routeur | `api/v1/client.py` | Une ligne par route : `ClientRead.model_validate(service.xxx(...))` ; dépendances `SessionDep`, `DepsDep` (`deps.py`), jamais SQLAlchemy ; `operationId` explicites (noms des fonctions générées côté front) ; enregistrement dans `api/v1/router.py` |
| Erreurs | `errors.py` + `api/handlers.py` | `AppError` → `{code, message, details}` (+ `existingId`/`archivedId`) ; `RequestValidationError` → 422 avec `details[].field` camelCase et messages français (`fr.PYDANTIC_MESSAGES` par type) ; `IntegrityError` converti en `IntegrityConflictError` (409) dans `get_session` ; toute autre exception → 500 journalisé, corps `internal_error` ; `Cache-Control: no-store` sur les erreurs |
| Tests | `tests/test_api_client.py`, `tests/test_services_client.py` | Liste CLAUDE.md « Tests » ; factory `make_client(session, clock, **overrides)` dans `conftest.py` via le service ; `TestClient(..., base_url="http://127.0.0.1")` (hôte accepté par D4.5) |
| Contrat | `uv run ffe openapi` puis `npm run gen:api` | Les deux tests de fraîcheur (§4) échouent tant que ce n'est pas fait |

Ce que la prochaine ressource copie sans réfléchir : les trois schémas, les six fonctions de service, le routeur à six routes, les tests par comportement. Ce qui se factorise à l'étape 6a (D6a.3) : `list`/`get`/`archive`/`unarchive` seulement.

## 10. Points d'extension (emplacements réservés, aucun code avant l'étape)

| Fonction | Étape | Emplacement prévu | Ce que la v1 garantit |
|---|---|---|---|
| Exports xlsx (openpyxl) — livré en F1, retiré par ADR-0013 | parqué | `api/src/ffe/exports/`, `GET /api/v1/projects/{id}/exports/list.xlsx`, `budget.xlsx` | mêmes lignes que les PDF (`exports/prescription.article_rows`), `money.py` unique |
| Exports PDF (WeasyPrint + Jinja2) | F2, revu étape 12 | `api/src/ffe/exports/prescription.py`, `GET …/exports/sheets.pdf`, `GET …/exports/list.pdf` | `fee` exclu des fiches, photo principale de l'article puis du produit, indice posé à l'émission |
| Recherche d'entreprises (API Recherche d'entreprises DINUM, repli INSEE, VIES) | F3 | `api/src/ffe/integrations/registry/` (`provider.py`, `recherche_entreprises.py`), `GET /api/v1/companies/search`, `POST /api/v1/companies/vat-check`, table `supplier_registry_snapshot` | colonnes `supplier.siren/siret/vat_number` ; ajout additif `activity_code`, `legal_form_code`, `admin_status`, `registry_source`, `registry_synced_at`, `vat_status`, `vat_checked_at` ; dirigeants jamais stockés ; proxy + cache côté API, le front n'appelle jamais l'extérieur |
| Import tarifs fournisseur xlsx/CSV — livré en F4, retiré par ADR-0013 (tag `v0-complet`) | parqué | `api/src/ffe/imports/`, `POST …/imports/products/preview` puis `/commit` | `product.reference`, `list_price_cents`, tables `import_batch`, `price_observation` à reprendre |
| « Coller une adresse » (JSON-LD / OpenGraph côté serveur) — livré F5, ADR-0014 | fait | `api/src/ffe/captures/extract.py`, `services/capture.py`, `GET /captures/preview`, `POST /captures/image` | `source_url` sur l'article et le produit ; pas de table `product_source` |
| Extension navigateur MV3 — livrée F6, ADR-0017 | fait | `extension/` (trois fichiers, sans build), `POST /api/v1/captures`, table `capture`, `setting.extension_token`, CORS limité à `chrome-extension://` | types générés depuis le même `openapi.json` |
| Achats (devis, PO, livraisons, factures) — livrés en 10a–10c, retirés par ADR-0013 (tag `v0-complet`) | parqué | `models/quote.py`, `purchase_order.py`… à reprendre avec le statut unique | statuts `deposit`, `purchased`, `quote_ref` sur l'article, journal |
| Bureau | si voulu | `desktop/` (pywebview ou Electron, à trancher) | `create_app(deps)` sans `listen`, statique intégré |
| Marge de revente, options A/B, délai, TVA | ouvert | `ADD COLUMN` `markup_bp`, `unit_sell_override_cents`, `setting.pricing_mode`, `alternative_of_id`, `lead_time_weeks`, `vat_rate_bp` | accroches additives décrites dans `DATA_MODEL.md` §8 |

## 11. Contraintes d'environnement

- **9p** : le dépôt est sur `/workspaces/Perso` (9p drvfs). Le code y vit ; `api/.venv` et `web/node_modules` sont des liens symboliques vers ext4 (`~/.venvs/ffe`, `~/.persist/npm/ffe-web/node_modules`) parce que lire des milliers de petits fichiers à travers 9p multipliait par trois le temps des tests (constaté le 2026-10-12 : vitest 41 s → voir §8) ; après un rebuild du conteneur, `npm ci` dans `web/` recrée les paquets au bon endroit via le lien ; **aucune donnée SQLite** n'y est jamais écrite. inotify ne remonte pas toujours : `vite.config.ts` prévoit `server.watch.usePolling` activable par variable d'environnement (`VITE_POLL=1`), `uvicorn --reload` avec `--reload-dir src` (polling via `watchfiles` par `WATCHFILES_FORCE_POLLING=1` si besoin). `vitest run` toujours, jamais en mode watch.
- **Accès depuis Windows** : Vite `server.host: true` ; l'API écoute `127.0.0.1` seulement et reste joignable depuis le navigateur Windows par la redirection de ports de WSL/devcontainer.
- **Persistance** : seul `~/.persist` survit au rebuild. Base, fichiers, sauvegardes, verrou et logs y vivent ; `FFE_BACKUP_DIR` sur le disque Windows est la seule copie hors conteneur. Navigateurs Playwright sous `~/.persist/ms-playwright` (`PLAYWRIGHT_BROWSERS_PATH` posé par les scripts `e2e` et `e2e:install` de `package.json`), donc conservés au rebuild.
- **Proxy TLS** : `uv` avec `system-certs = true` (comme Racoon) ; côté npm, `cafile`/`strict-ssl` dans `.npmrc` local si `npm install` échoue (jamais versionné). Constaté à l'étape 1 : `uv` et `npm` passent sans réglage supplémentaire.
- **Upload en tests (jsdom)** : Vitest reconstruit un `FormData` jsdom en Blob vide ; `queries/file.ts` construit donc le corps multipart à la main (octets + `boundary`), standard pour python-multipart et pour le navigateur, et `tests/helpers/fakeApi.ts` le relit octet par octet (jamais via `TextDecoder('latin1')`, qui remappe 0x80–0x9F).
- **Venv Python (maître)** : `api/.venv` est un **lien symbolique vers `~/.venvs/ffe`** (ext4). Mesuré à l'étape 1 : la suite pytest prend 3,9 s avec un venv sur 9p, 0,6–0,8 s sur ext4. `uv` suit le lien sans réglage ; `.venv` est ignoré par git ; après reconstruction du devcontainer, recréer le lien (README « Lancer »). Les shells de Claude Code héritent du bloc `env` de `~/.persist/claude/settings.json` écrit pour Racoon (`UV_PROJECT_ENVIRONMENT=~/.venvs/racoon`, `UV_FROZEN=1`, `UV_PYTHON_PREFERENCE=only-managed`) ; le terminal de l'utilisateur n'y est pas soumis. Le bloc `env` de `.claude/settings.json` du projet (`UV_PROJECT_ENVIRONMENT=/workspaces/Perso/FFE/api/.venv`, `UV_FROZEN=0`) **ne le neutralise pas** (constaté le 2026-10-10 sur une session neuve : le réglage utilisateur l'emporte). Conséquence : tout `uv run` lancé par Claude sans préfixe resynchronise le venv de Racoon sur le lock de FFE (arrivé deux fois, réparé par `uv sync` dans Racoon). Protections : `check.sh` exporte lui-même `UV_PROJECT_ENVIRONMENT="$PWD/api/.venv"` et `UV_FROZEN=0` ; toute autre commande `uv` de Claude porte ce préfixe (CLAUDE.md). Correction définitive, à la main de l'utilisateur : déplacer ce bloc `env` du réglage utilisateur vers `.claude/settings.json` de Racoon. `npm create vite` a échoué sans TTY : `web/` a été écrit à la main (mêmes fichiers).
- **Outils absents** : pas de `sqlite3` CLI dans le conteneur ; inspection par `ffe db check` et l'extension VS Code SQLite.
- **Sécurité locale** : écoute `127.0.0.1:8000`, CORS fermé jusqu'à l'extension, aucune authentification tant que l'outil n'est pas partagé.
