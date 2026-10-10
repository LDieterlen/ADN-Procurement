# Feuille de route

Outil de procurement FF&E, local, mono-utilisateur. Back Python (`api/`), front TypeScript (`web/`), base SQLite sur `~/.persist/ffe/`. Décisions structurantes : `docs/decisions/ADR-0001` à `ADR-0005`. Modèle : `docs/DATA_MODEL.md`. Compte rendu de chaque session : `docs/JOURNAL.md`.

## Mode d'emploi

- **Une étape à la fois.** La session commence par « étape N ». Relire ce fichier et `JOURNAL.md` ; ne rien toucher d'une étape ultérieure. Un besoin hors étape va dans « Idées parquées », jamais dans le code.
- **Décisions préalables en un bloc.** Avant de coder, poser toutes les décisions « D » de l'étape en un seul bloc numéroté, chacune avec son défaut. Silence = défaut appliqué, noté dans `JOURNAL.md`. Une décision tranchée se cite (ADR ou JOURNAL), ne se redemande pas.
- **Critère de fini vérifiable par l'utilisateur**, en 5 minutes, sans lire le code. Tant qu'il n'est pas atteint, l'étape n'est pas cochée.
- **Pas de code pour plus tard.** Ni table, ni colonne, ni dossier qui ne soit utilisé et testé dans l'étape en cours ou dans l'étape suivante nommée ici (ex. tables de l'étape 3 servies par l'API de l'étape 4). Les ajouts passent par `CREATE TABLE` ou `ADD COLUMN` nullable.
- **Une tâche = fichiers + `./check.sh` vert + commit conventionnel en français.** Une étape = 1 à 4 commits. Une migration Alembic par étape, relue ligne à ligne.
- **Cocher ici** : `[x] faite le AAAA-MM-JJ` avec le hash du dernier commit, et copier le compte rendu (≤ 10 lignes) dans `JOURNAL.md`.
- Les livrables ci-dessous sont transposés d'une conception initiale en TypeScript unique ; les chemins `api/src/ffe/…` des étapes futures (F1 à F6) sont indicatifs et se tranchent à leur étape.

Vue d'ensemble : 0 outils · 1 squelette · 2 modèle · 3 base · 4 API `client` · 5 front `client` · 6a référentiel · 6b produits · 6c projets/zones · 7a/b/c lignes · 8 budgets · 9 fiabilité · 10a/b/c achats · F1–F6 futures.

---

## Étape 0 — Outils de travail

- **Objectif** : chaque session future démarre avec le même contexte, les mêmes règles et une mémoire des décisions. Aucun code applicatif.
- **Livrables** : dépôt `/workspaces/Perso/FFE` (`git init -b main`, `.gitignore`, `.gitattributes`, `.editorconfig`, `check.sh`, `.claude/settings.json`), `CLAUDE.md`, `README.md`, `docs/` (ARCHITECTURE, DATA_MODEL brouillon, API conventions, ROADMAP, GLOSSARY, JOURNAL), `docs/decisions/` (gabarit + ADR-0001 à 0005), mémoire Claude Code.
- **Critère de fini** : `ls` montre les fichiers ci-dessus et `FF&E` n'existe plus ; un commit sur `main`, `git status` propre ; ADR ≤ 25 lignes chacune et approuvées ; aucun `.py`, `.ts`, `pyproject.toml`, `package.json`.
- **Décisions préalables** : D0.9 catégories (défaut : 13 codes, voir JOURNAL) ; D0.10 `FFE_BACKUP_DIR` (défaut `/workspaces/Perso/FFE-sauvegardes/`) ; D0.11 frais en lignes `kind='fee'` (défaut) ; D0.12 dirigeants jamais stockés (défaut) ; D0.13 CLAUDE.md en français (défaut) ; D0.14 options A/B hors v1, `alternative_of_id` (défaut) ; D0.15 SQLAlchemy 2.0.x, pas de SQLModel, STRICT, pas de CI (défaut) ; D0.16 schedules Excel existants (facultatif).
- **Risques** : documents qui contredisent le cadrage (marge de revente, devise unique) ; sur-spécifier le modèle avant l'étape 2.
- **État** : [x] faite le 2026-10-09 — commit initial `chore: initialisation du dépôt` (premier hash de `git log` ; seul commit sans hash reporté ici).

## Étape 1 — Squelette outillage

- **Objectif** : `./check.sh` vert, une API qui répond, un front qui l'affiche, accessible depuis le navigateur Windows. Aucune table.
- **Livrables** : `api/` projet uv (`pyproject.toml`, `.python-version`, `create_app(deps)`, `GET /api/v1/health` → `{ok}`, `ffe serve`, `ffe openapi`, pytest, ruff `E9,F,I,UP`, pyright) ; `web/` paquet npm (Vite 8 `host:true` + proxy `/api`, React 19, TS 7 strict, Tailwind 4, Vitest, Prettier `semi:false, singleQuote:true, printWidth:160`) ; page « API OK » ; génération de `web/src/api/schema.d.ts` depuis `api/openapi.json` (commité par `ffe openapi`) ; deux tests de fraîcheur (pytest `test_openapi.py` et Vitest `schema-freshness.test.ts`), détail ARCHITECTURE §4 ; `check.sh` complété ; `.claude/settings.json` complété. Pré-requis vérifiés le 2026-10-09 : `uv` 0.12.18, Node v24.21.0 (nvm), Python 3.14.7 installé par uv (`uv python install 3.14` si absent). Amorçage : `uv init --package api --python 3.14` puis `uv add fastapi uvicorn typer pydantic-settings` ; `npm create vite@latest web -- --template react-ts` puis `npm i -D vitest prettier openapi-typescript` et `npm i openapi-fetch @tanstack/react-query react-router react-hook-form tailwindcss @tailwindcss/vite` ; versions exactes relevées dans JOURNAL.
- **Critère de fini** : `./check.sh` vert ; `uv run ffe serve` puis `npm run dev` affichent « API OK » depuis Windows ; modifier une route sans relancer `ffe openapi` puis `gen:api` fait échouer un test de fraîcheur.
- **Décisions préalables** : D1.1 ports 8000 API / 5173 Vite (défaut) ; D1.2 SQLAlchemy 2.0.x, pas 2.1 (défaut) ; D1.3 Tailwind dès maintenant (défaut : oui) ; D1.4 uv `native-tls = true` (défaut : oui, comme Racoon) ; D1.5 instantané `api/openapi.json` commité, source de `gen:api` (défaut : oui, ARCHITECTURE §4).
- **Risques** : proxy TLS du devcontainer bloquant `uv sync` ou `npm install` ; `127.0.0.1` inaccessible depuis Windows → repli consigné dans une nouvelle ADR ou un paragraphe JOURNAL (ADR-0001 acceptée ne se modifie pas) ; deux chaînes d'outils à tenir vertes.
- **État** : [x] faite le 2026-10-09 — commits `8de723d` (api), `664a309` (web), puis le commit de docs de la même session. Écart au plan : TypeScript 6.0.3 au lieu de 7 (repli ADR-0001, JOURNAL D1.6) ; `@tanstack/react-query`, `react-router`, `react-hook-form` reportés à l'étape 5 (première utilisation). Affichage depuis le navigateur Windows : à confirmer par l'utilisateur (JOURNAL « à vérifier »).

## Étape 2 — Modèle de données validé (aucun code)

- **Objectif** : `DATA_MODEL.md` final, table par table, approuvé avant la première migration. L'étape la plus importante du projet.
- **Livrables** : pour chaque table : étape de création, colonnes (nom EN, type SQLite STRICT, nullable, défaut), CHECK, UNIQUE (partiels avec `COALESCE`), FK ; invariants ; exemple de ligne ; Mermaid ; statuts et transitions ; formules de `money.py` (net, net EUR, total HT, TVA) ; précédence des défauts (remise, TVA, devise) ; règle des codes ; politique d'archivage/suppression ; ADR-0005 confirmée.
- **Critère de fini** : l'utilisateur rejoue 12 cas sur papier (liste maîtresse, citée par DATA_MODEL §10 et ADR-0005) : fauteuil dans 2 projets à 2 prix ; chambre ×12 avec 2 lampes → 24 ; même lampe dans Chambre A ×12 et B ×8, devis change le prix → 1 mise à jour, 1 code ; net sans tarif ; `existing` à 0 € + transport forfaitaire par fournisseur ; prix révisé après validation « que voyait le client ? » ; moquette 12,5 m² ; fauteuil en 2 finitions = 2 lignes ; fournisseur en GBP → totaux EUR ; 2 budgets globaux impossibles ; remplacement de produit après validation → nouvelle ligne, ancienne `replaced` ; annuler une ligne libère le budget. Chaque colonne justifiée par une étape ≤ 9.
- **Décisions préalables** : D2.1 statuts : draft/specified/quoted/approved/ordered/delivered/installed/cancelled/replaced + indicateur `on_hold` (défaut) ; D2.2 codes `<CAT>-NNN` sur le niveau 1, éditables en `draft`, immuables ensuite (défaut) ; D2.3 multiplicateur de zone ≥ 1 (défaut) ; D2.4 devises : `currency` + `fx_rate_micro` figés par ligne, taux saisi à la main (défaut, à confirmer) ; D2.5 TVA : taux par ligne, défaut projet, défaut `setting` (défaut) ; D2.6 `project.contingency_bp` créé en 6c ou ajouté en 8 (à trancher) ; D2.7 quantités en millièmes (défaut).
- **Risques** : vouloir tout modéliser (achats, logistique) ; colonnes « au cas où » ; oublier un UNIQUE partiel ; `fx_rate_micro` sans source claire.
- **État** : [x] faite le 2026-10-09 — commit `4afeb55` (modèle + ADR-0005 acceptée) puis le commit de docs de la session. Décisions D2.1 à D2.15 : défauts, validés par l'utilisateur (JOURNAL). Critère de fini amendé : les choix de conception sont validés par l'utilisateur ; les 12 cas sont calculés et recoupés par Claude (DATA_MODEL §10), et deviennent les cas de référence de `test_money.py` (7a).

## Étape 3 — Infrastructure base (migration 0001)

- **Objectif** : la base existe sur `.persist`, le cycle de démarrage et le verrou fonctionnent, les contraintes sont prouvées par des tests. Seules `setting` et `client` sont créées.
- **Livrables** : `api/src/ffe/db/` (engine, pragmas WAL/`synchronous=FULL`/`foreign_keys=ON`/`busy_timeout=5000`/`trusted_schema=OFF`, `fs_check` via `/proc/mounts`, `lock`, `startup`, `backup` via `sqlite3.Connection.backup()`, `json_io`) ; `alembic.ini`, `env.py` (`render_as_batch=True`, `compare_type=True`), migration `0001` relue ; modèles `setting`, `client` ; CLI `ffe db migrate|backup|restore|check|export-json|import-json` (`seed` à l'étape 6a) ; `GET /health` enrichi (`dbPath, isDevDb, schemaRevision, lastBackupAt, backupDirOk`) ; tests `test_integrity` (FK, CHECK, UNIQUE partiel, STRICT, pragmas actifs), `test_migrations` (rejeu sur fichier temporaire + `alembic check`), `test_backup`, `test_startup`.
- **Critère de fini** : base créée sous `~/.persist/ffe-dev/` ; `FFE_DATA_DIR=/workspaces/x uv run ffe serve` refuse en citant « 9p » ; deuxième démarrage refusé par le verrou ; `uv run ffe db check` vert et liste les tables avec leur drapeau STRICT (lu dans `sqlite_master.sql`) en montrant `setting` et `client` (pas de `sqlite3` CLI dans le conteneur, ARCHITECTURE §11).
- **Décisions préalables** : D3.1 valeurs initiales de `setting` (`default_vat_bp` 2000, `base_currency` 'EUR' ; `default_contingency_bp` et `project_code_prefix` à trancher) ; D3.2 rotation des sauvegardes par date calendaire : 14 jours + 8 semaines + 12 mois (défaut) ; D3.3 sauvegarde automatique avant tout `upgrade` (défaut, non négociable) ; D3.4 sélection de la base : `FFE_ENV` (`dev` par défaut) + `ffe serve --prod` pour la base réelle (défaut, ARCHITECTURE §1).
- **Risques** : Alembic batch sur SQLite recrée des tables → relecture ligne à ligne ; pragmas définis mais non vérifiés → rôle de `test_integrity` ; `fs_check` trompé par un lien symbolique → `realpath`.
- **État** : [x] faite le 2026-10-10 — commits `d56edc6` (code), `78bd39e` (point de reprise) puis le commit de docs de clôture. D3.1 à D3.11 : défauts. Critère de fini rejoué en commandes (JOURNAL). Écart : `db/migrate.py`, `deps.py`, `schemas/base.py` nés à l'étape 3 (ARCHITECTURE §2).

## Étape 4 — API `client` (gabarit)

- **Objectif** : une ressource complète qui sert de gabarit à toutes les suivantes.
- **Livrables** : `schemas/client.py` (Pydantic v2 in/out, camelCase), `services/client.py` (list avec recherche + `includeArchived`, get, create, update, archive, unarchive, `updated_at` posé par le service), `api/v1/client.py`, erreurs typées `{code, message, details[{field, message}]}` (422 champ par champ, 404, 409 avec `archivedId`, 500 journalisé), `tests/test_api_client.py`, `docs/ARCHITECTURE.md` « anatomie d'une ressource », `docs/API.md` complété.
- **Critère de fini** : via `curl` : création ; champ invalide → 422 citant le champ ; doublon d'un client archivé → 409 avec `archivedId` ; doublon actif → 409 `duplicate` avec `existingId`, `?force=true` → 201 ; archive puis unarchive ; `updated_at` change ; `schema.d.ts` régénéré et test de fraîcheur vert.
- **Décisions préalables** : D4.1 format d'erreur ci-dessus (défaut) ; D4.2 pas de pagination sur `/clients` (défaut ; le catalogue en aura une à 6a/6b, API.md §Listes) ; D4.3 ids entiers dans les URL (défaut) ; D4.4 champs client = `DATA_MODEL.md` (défaut).
- **Risques** : CRUD générique prématuré → écrire `client` à la main ; divergence snake_case/camelCase entre Pydantic et le front.
- **État** : [x] faite le 2026-10-10 — commit `feat(api): …` puis `docs(repo): étape 4 close` (hashes dans le JOURNAL). D4.1 à D4.12 : défauts. Critère de fini rejoué en `curl` (JOURNAL). Divergence camelCase rencontrée et réglée : `BaseSchema` sans `serialize_by_alias`, FastAPI sérialise par alias, `model_dump()` reste snake_case.

## Étape 5 — Front `client` + composants de base

- **Objectif** : liste, formulaire création/édition, archivage, et les composants réutilisés partout ensuite.
- **Livrables** : `web/src/api/client.ts` (openapi-fetch) + `api/queries/client.ts` (hooks TanStack Query), `components/ui` (Button, Toast, ConfirmDialog, EmptyState), `components/forms` (Form, Field, TextInput, Select, Money, Quantity, Bp, DateField, EntityPicker), `components/tables/DataTable`, `pages/clients/`, `routes.tsx` (`/clients`, `/clients/new`, `/clients/:id`), layout avec barre latérale, erreurs 422 sous les champs, test Vitest jsdom du formulaire.
- **Critère de fini** : depuis le navigateur Windows : créer 2 clients, modifier, archiver, filtre « afficher archivés », désarchiver, recharger → tout persiste ; serveur coupé → message, pas d'écran blanc.
- **Décisions préalables** : D5.1 react-hook-form dès maintenant (défaut : oui) ; D5.2 Tailwind pur, sans bibliothèque de composants (défaut) ; D5.3 pas de mode sombre (défaut) ; D5.4 textes FR inline dans les composants, pas de couche i18n front (défaut ; les messages serveur restent dans `api/src/ffe/i18n/fr.py`).
- **Risques** : Tailwind 4 + Vite 8 ; champs typés (Money, Bp) qui laissent passer des flottants ; `host:true` oublié.
- **État** : [ ] à faire

## Étape 6a — Référentiel : fournisseurs, fabricants, catégories (migration 0002)

- **Objectif** : copier le gabarit pour trois entités ; décider ce qui mérite d'être factorisé. **Première donnée réelle : l'historique des migrations devient immuable.**
- **Livrables** : modèles `supplier`, `manufacturer`, `category` ; migration `0002` relue ; `ffe db seed` idempotent (catégories par `code`) ; schémas/services/routeurs/tests/pages. Formulaire fournisseur : nom (seul requis), bloc repliable « Identité légale » (raison sociale, pays, SIREN, SIRET, TVA, adresse structurée), contact, devise par défaut, remise par défaut, conditions de paiement. Catégories : liste indentée 2 niveaux, code, ordre.
- **Critère de fini** : 3 fournisseurs réels, 2 fabricants, 1 sous-catégorie ajoutée ; `test_migrations` rejoue 0001 + 0002 ; `ARCHITECTURE.md` dit ce qui a été factorisé.
- **Décisions préalables** : D6a.1 seed exact = 13 codes de D0.9 (défaut) ; D6a.2 catégories éditables (défaut : oui) ; D6a.3 factoriser seulement list/get/archive/unarchive, `create`/`update` explicites (défaut) ; D6a.4 fabricant = table (défaut) ; D6a.5 seed des catégories par `ffe db seed` idempotent (défaut) ou dans la migration 0002.
- **Risques** : tentation d'ajouter la recherche d'entreprises (F3) ; formulaire fournisseur trop long ; SIREN/SIRET incohérents → CHECK en base.
- **État** : [ ] à faire

## Étape 6b — Produits et fichiers (migration 0003)

- **Objectif** : fiche catalogue réutilisable avec photos et fiches techniques, dédoublonnées par hash.
- **Livrables** : modèles `product`, `file`, `product_file` ; migration `0003` ; `services/file.py` (sha256, écriture `FFE_DATA_DIR/files/<sha256>.<ext>`, dédoublonnage, MIME jpeg/png/webp/pdf) ; routes : voir API.md (`/products` paginé, `POST /files` multipart avec sha256 et dédoublonnage, `POST /products/{id}/files {fileId, kind, isPrimary}`, `DELETE /products/{id}/files/{fileId}`, `GET /files/{id}/content`) ; UI : liste avec photo principale, filtres catégorie/fabricant/fournisseur, fiche, formulaire (prix catalogue + devise + HT/TTC + « tarif du … », « arrêté le »), dépôt d'images, photo principale, champ « URL source ».
- **Critère de fini** : `curl` crée un produit avec photo ; même photo 2× → 1 fichier sur disque ; 5 produits réels saisis avec photo ; un produit arrêté est marqué dans la liste ; MIME refusé → 422, taille dépassée → 413.
- **Décisions préalables** : D6b.1 limite 20 Mo par fichier (défaut) ; D6b.2 pas de vignette, le navigateur redimensionne (défaut) ; D6b.3 obligatoires : nom + catégorie (défaut) ; D6b.4 fichiers hors `ffe db backup` par défaut, option `--with-files` à l'étape 9 (défaut).
- **Risques** : upload multipart FastAPI et limites de taille ; fichiers orphelins (ramasse-miettes = idée parquée).
- **État** : [ ] à faire

## Étape 6c — Projets et zones (migration 0004)

- **Objectif** : le conteneur projet et ses zones à multiplicateur.
- **Livrables** : modèles `project`, `zone` ; migration `0004` ; services/routeurs/pages projet (code, nom, client, statut, adresses chantier et livraison, `default_vat_bp`, dates) et zones imbriquées (`/projects/{id}/zones` : code, nom, type, multiplicateur, ordre, archivage, suppression si vide) ; page projet à onglets (Zones · Lignes · Budget, les deux derniers absents tant que non livrés) ; 409 à l'archivage d'un client avec projet non clos.
- **Critère de fini** : projet « Hôtel X » avec « Lobby ×1 », « Chambre type A ×12 », « Chambre type B ×8 », « SDB type A ×12 » ; renommage, réordonnancement ; archiver le client → 409 lisible ; clore le projet puis archiver → OK.
- **Décisions préalables** : D6c.1 code projet auto `2026-001`, éditable (défaut) ; D6c.2 statuts prospect/active/delivered/closed/cancelled (défaut) ; D6c.3 type de zone : texte libre avec suggestions (défaut).
- **Risques** : `UNIQUE(id, project_id)` oublié sur `zone` (nécessaire aux FK composites de 7a) ; multiplicateur modifié après placement → totaux changent, c'est voulu, à afficher.
- **État** : [ ] à faire

## Étape 7a — Lignes : modèle, calculs, service, routes (migration 0005)

- **Objectif** : le cœur métier côté serveur, prouvé par des tests avant toute UI.
- **Livrables** : modèles `project_item`, `project_item_placement`, `project_item_event`, `code_sequence`, `project_item_file` ; migration `0005` ; `money.py` (entiers : net, net EUR, total HT, TVA par taux, quantité totale, sommes par zone/catégorie, date de commande au plus tard) ; `services/project_item.py` (création depuis produit ou libre avec précédence des défauts, génération du code, placement, transitions, snapshot `approved_*`, journal, suppression bornée) ; routes : voir API.md (`/projects/{id}/project-items`, `/project-items/{id}`, `/project-items/{id}/status`, `/project-items/{id}/placements` + `PATCH/DELETE /placements/{id}`, `/project-items/{id}/events`, `/project-items/{id}/files`) ; `tests/test_money.py` **blindé** (demande de l'utilisateur, 2026-10-09) : les 12 cas de DATA_MODEL §10 au centime, écrits avant le code ; cas limites (remise 0 et 10 000 bp, quantité 0, `fx_rate_micro` 1 000 000 et valeurs extrêmes, arrondi demi-supérieur aux frontières `.5`, grands montants) ; tests par propriétés (`hypothesis`, dépendance de test à inscrire dans l'ADR ou le JOURNAL de 7a) : résultat entier ≥ 0, monotonie en quantité et en prix, égalité avec les CTE SQL de §8 sur un jeu aléatoire, écart par zone vs par ligne ≤ 1 centime par placement ; `tests/test_api_project_item.py`.
- **Critère de fini** : 3 lignes dont une libre et une `existing` ; même lampe dans Lobby ×1 (qté 2) et Chambre type A ×12 (qté 1) → 1 code, quantité = 2×1 + 1×12 = 14 (exemple DATA_MODEL §6) ; ligne en GBP → total EUR au centime ; totaux vérifiés à la main ; `ordered → draft` refusé ; prix catalogue modifié n'affecte pas la ligne.
- **Décisions préalables** : D7.1 transitions libres avec confirmation jusqu'à `ordered`, puis retour impossible sauf `cancelled` avec note (défaut) ; D7.2 `ordered` exige `order_ref`, `approved` pose le snapshot (défaut) ; D7.3 arrondi au centime par ligne puis somme (défaut) ; D7.4 « Rafraîchir depuis le catalogue » explicite, journalisé (défaut) ; D7.5 marge d'alerte 14 jours (défaut).
- **Risques** : flottants qui se glissent dans `money.py` ; FK composites `(zone_id, project_id)` ; `code_sequence` décrémenté par erreur.
- **État** : [ ] à faire

## Étape 7b — Lignes : UI tableau et panneau latéral

- **Objectif** : saisir et lire les lignes par zone depuis le navigateur.
- **Livrables** : onglet « Lignes » groupé par zone (code, type, désignation, finition, photo, qté/zone, ×, qté totale, PU net + devise, PU net EUR, total HT EUR, fournisseur, délai, statut) ; ajout rapide « depuis le catalogue » ou « ligne libre » ; panneau latéral (saisie du net **ou** tarif + remise ; devise + taux) ; « Ajouter à une autre zone » ; totaux par zone et projet venus du serveur.
- **Critère de fini** : 3 lignes créées dans « Chambre type A ×12 », une placée aussi dans « Chambre type B », totaux identiques à 7a ; réévaluation de D5.1 consignée.
- **Décisions préalables** : D7b.1 colonnes affichées par défaut (défaut : liste ci-dessus) ; D7b.2 édition en ligne limitée à qté et statut (défaut).
- **Risques** : le front qui additionne « pour aller vite » → interdit ; tableau trop large sur petit écran.
- **État** : [ ] à faire

## Étape 7c — Lignes : statuts, historique, filtres, impression

- **Objectif** : piloter le cycle de vie et communiquer avant les exports.
- **Livrables** : changement de statut avec confirmation et note ; panneau « Historique » (`project_item_event`) ; filtres statut/type/fournisseur ; colonne « Commander avant le » calculée, tri, surlignage si dépassée ; `@media print` de l'onglet Lignes (variante client sans colonnes achat, sans `internal_notes`).
- **Critère de fini** : `ordered` puis tentative `draft` → refusé ; l'historique montre le prix validé à une date ; impression lisible sans colonnes internes.
- **Décisions préalables** : D7c.1 variante client = `client_description`, pas de prix d'achat (défaut) ; D7c.2 `fee` exclu de l'impression client (défaut).
- **Risques** : dérive des calculs entre impression et écran → même DTO.
- **État** : [ ] à faire

## Étape 8 — Budgets et tableau de bord (migration 0006)

- **Objectif** : enveloppes cibles et comparaison continue au prescrit.
- **Livrables** : modèle `budget_line` ; migration `0006` ; `services/budget.py` : Budget / Prescrit / Validé / Reste par zone et par catégorie via `money.py` (statuts et kinds comptés, définition du Validé : DATA_MODEL §5) ; onglet « Budget » (tableau, barre d'écart, « HT EUR » dans chaque en-tête, `@media print`) ; accueil multi-projets ; alertes ; `tests/test_api_budget.py`.
- **Critère de fini** : budget global 50 000 € et « Chambres » 30 000 € ; Prescrit et Reste cohérents avec l'onglet Lignes ; annuler une ligne libère le budget ; 2 budgets globaux → 409 ; aucune colonne « Engagé » (arrive en 10b).
- **Décisions préalables** : D8.1 budget en net HT EUR (défaut) ; D8.2 contingence au niveau projet (défaut) ; D8.3 vue par zone par défaut, bascule par catégorie (défaut) ; D8.4 alerte à 90 % (orange) et 100 % (rouge) (défaut).
- **Risques** : `UNIQUE` sur colonnes nullables sans `COALESCE` ; `on_hold` compté mais à signaler.
- **État** : [ ] à faire

## Étape 9 — Polish fiabilité

- **Objectif** : perdre la base et tout retrouver.
- **Livrables** : `ffe db backup [--with-files]` (rotation, copie vers `FFE_BACKUP_DIR` puis `quick_check` sur la copie), `ffe db restore <fichier>` (`quick_check`, sauvegarde de l'actuelle, confirmation), `ffe db check [--files]`, `export-json --with-files` (format et `schemaRevision` : ARCHITECTURE §5) ; minuterie horaire appliquant la règle 24 h (ADR-0002) et sauvegarde à l'arrêt ; journal : ARCHITECTURE §5 (500 toujours journalisés) ; `GET/PATCH /settings` et page « Réglages » (agence, défauts, chemins, « Sauvegarder maintenant », dernière sauvegarde) ; `docs/RUNBOOK.md` (base corrompue, disque plein, migration échouée, verrou orphelin, devcontainer reconstruit, prix faux validé) ; 2 parcours Playwright Chromium.
- **Critère de fini** : supprimer `ffe.sqlite`, `ffe db restore` → tout revient ; une copie existe dans le dossier Windows et passe `quick_check` ; export JSON lisible ; Réglages montre la date de dernière sauvegarde ; un 500 provoqué apparaît dans le journal.
- **Décisions préalables** : D9.1 `FFE_BACKUP_DIR` (défaut D0.10) ; D9.2 Playwright, 2 parcours (défaut : oui) ; D9.3 jeton d'API : reporté à F6 (défaut).
- **Risques** : copie vers 9p sans `quick_check` ; navigateurs Playwright hors `.persist` perdus au rebuild.
- **État** : [ ] à faire

## Étape 10a — Devis

- **Objectif** : comparer des devis fournisseurs et en retenir un par ligne.
- **Livrables** : tables `quote`, `quote_line`, `quote_file` (migration) ; retenir un devis met à jour `unit_cost_cents`/`discount_bp`/`lead_time_weeks` de la ligne (événement) et passe `quoted` ; UI de comparaison.
- **Critère de fini** : 2 devis pour une ligne, un retenu, le prix change et l'historique l'enregistre.
- **Décisions préalables** : D10a.1 revalider la machine à états avec des cas réels (obligatoire) ; D10a.2 un devis = un fournisseur, un projet (défaut).
- **Risques** : devis multi-devises vs `fx_rate_micro` de la ligne.
- **État** : [ ] à faire

## Étape 10b — Bons de commande

- **Objectif** : engager les achats et verrouiller les lignes.
- **Livrables** : tables `purchase_order`, `purchase_order_line`, `purchase_order_file` ; numérotation via `code_sequence` ; statuts draft/issued/acknowledged/partially_delivered/closed/cancelled ; émettre un PO passe les lignes à `ordered` avec `order_ref` ; colonne « Engagé » dans le budget.
- **Critère de fini** : PO sur 3 lignes, total = somme vérifiée, lignes verrouillées.
- **Décisions préalables** : D10b.1 numérotation annuelle (défaut) ; D10b.2 PO mono-projet, mono-fournisseur (défaut) ; D10b.3 adresse de livraison = projet (défaut).
- **Risques** : statuts `in_production`/`shipped` ajoutés sans besoin réel.
- **État** : [ ] à faire

## Étape 10c — Réceptions et factures

- **Objectif** : suivre ce qui arrive et ce qui est payé.
- **Livrables** : tables `delivery`, `delivery_line` (qté reçue, réserves), `supplier_invoice` (acompte/solde, échéance, `paid_at`) ; colonnes « Facturé / Payé » ; `delivered` quand reçu = commandé.
- **Critère de fini** : réception partielle puis totale ; factures d'acompte et de solde ; budget cohérent.
- **Décisions préalables** : D10c.1 factures + paiements en une table (défaut) ; D10c.2 réception partielle autorisée (défaut).
- **Risques** : trésorerie TTC et TVA d'achat hors périmètre → exporter, ne pas comptabiliser.
- **État** : [ ] à faire

## F1 — Exports xlsx

- **Objectif** : schedule interne / client et récap budget en Excel, totaux identiques à l'écran.
- **Livrables** : `api/src/ffe/exports/` (openpyxl) ; `GET /api/v1/projects/{id}/exports/schedule.xlsx?variant=internal|client` ; table `project_file` (`issued_at`, `variant`) pour conserver chaque export émis.
- **Critère de fini** : totaux Excel = totaux de l'onglet Lignes et Budget ; variante client sans prix d'achat.
- **Décisions préalables** : DF1.1 une feuille par zone ou une seule (défaut : une seule, une ligne par placement) ; DF1.2 colonnes.
- **Risques** : formules Excel recalculant → écrire des valeurs, jamais de formules.
- **État** : [ ] à faire

## F2 — Exports PDF

- **Objectif** : book client avec photos, bon de commande, RFQ.
- **Livrables** : gabarits Jinja2 + WeasyPrint ; `GET /api/v1/projects/{id}/exports/book.pdf`, `GET /api/v1/purchase-orders/{id}/pdf` ; stockage dans `project_file`/`purchase_order_file` ; `file.license_note` (ADD COLUMN) ; vignettes reconsidérées.
- **Critère de fini** : book d'un projet réel, une page par article, regroupé par zone, photo principale ; PO imprimable avec coordonnées agence et fournisseur.
- **Décisions préalables** : DF2.1 mise en page ; DF2.2 vignettes (défaut : non).
- **Risques** : WeasyPrint et dépendances système dans le devcontainer.
- **État** : [ ] à faire

## F3 — Recherche d'entreprises + VIES

- **Objectif** : pré-remplir un fournisseur depuis un registre, vérifier un n° de TVA UE.
- **Livrables** : `api/src/ffe/integrations/registry/` (interface `search/get` ; API Recherche d'entreprises DINUM gratuite, 7 req/s, cache 24 h, timeout 2 s, `User-Agent` explicite ; repli INSEE ; VIES) ; routes : voir API.md (`GET /companies/search?q=&country=FR`, `POST /companies/vat-check`) ; ADD COLUMN `supplier.activity_code`, `legal_form_code`, `admin_status`, `registry_source`, `registry_synced_at`, `vat_status`, `vat_checked_at` ; table `supplier_registry_snapshot` ; UI : champ « Nom, SIREN ou SIRET » + pays, suggestions, pré-remplissage éditable, « Mettre à jour depuis le registre » avec diff.
- **Critère de fini** : 3 fournisseurs réels retrouvés et pré-remplis ; un artisan non diffusible saisi à la main ; VIES saturé affiche « non vérifiable », jamais « invalide ».
- **Décisions préalables** : DF3.1 dirigeants jamais stockés (tranché D0.12) ; DF3.2 repli INSEE/Pappers au départ (défaut : non).
- **Risques** : 429 et `Retry-After` ; marque ≠ raison sociale ; le front qui appelle le registre directement → interdit.
- **État** : [ ] à faire

## F4 — Import tarifs fournisseur xlsx/CSV

- **Objectif** : charger les tarifs fournis par le fournisseur (voie légale de la « copie de catalogue »).
- **Livrables** : `api/src/ffe/imports/` ; routes : voir API.md (`POST /imports/products/preview` multipart + `supplierId` + mapping de colonnes sauvegardé par fournisseur, puis `POST /imports/products/commit`) ; tables `import_batch`, `price_observation` ; `list_price_*` = dernière observation ; produits disparus → `discontinued_on`.
- **Critère de fini** : un tarif réel importé, produits créés ou mis à jour, mapping réutilisé au second import.
- **Décisions préalables** : DF4.1 clé de rapprochement : `gtin` puis `(manufacturer_id, manufacturer_ref)` puis `supplier_ref` (défaut) ; DF4.2 PDF tarifaire hors périmètre (défaut).
- **Risques** : colonnes hétérogènes ; prix TTC non signalés → `list_price_tax_mode` obligatoire au mapping.
- **État** : [ ] à faire

## F5 — Coller une URL

- **Objectif** : pré-remplir une fiche produit depuis une page web, côté serveur.
- **Livrables** : `api/src/ffe/captures/` ; `GET /api/v1/captures/preview?url=`, `POST /api/v1/captures` ; extraction JSON-LD `schema.org/Product` → microdata → OpenGraph → repli titre/image ; timeout 10 s, `User-Agent` honnête, pas de rendu JS, pas de parseur par site ; images via `file` ; table `product_source` (`url_hash` UNIQUE, `raw_json`).
- **Critère de fini** : 3 URL de fournisseurs réels donnent une fiche pré-remplie ; une URL sans JSON-LD donne au moins titre + image ; rien n'est enregistré sans confirmation.
- **Décisions préalables** : DF5.1 dédoublonnage par `url_hash` puis `gtin` puis `(marque, ref)` avec confirmation (défaut) ; DF5.2 bonus Shopify `/products/<handle>.json` (défaut : non).
- **Risques** : anti-bot ; CGU ; aucune capture en masse, jamais de crawl.
- **État** : [ ] à faire

## F6 — Extension navigateur

- **Objectif** : « Ajouter à FF&E » depuis la page consultée, capture unitaire à la demande.
- **Livrables** : `extension/` (MV3 Chrome + Firefox, `host_permissions` `http://127.0.0.1/*` et `http://localhost/*`) ; envoi vers `POST /api/v1/captures` ; jeton Bearer `setting.api_token` (ADD COLUMN) ; CORS limité aux origines d'extension ; table `capture_inbox` ; distribution « load unpacked » / `web-ext sign --channel=unlisted`.
- **Critère de fini** : depuis Chrome sous Windows, un produit capturé apparaît dans la boîte de réception puis devient un produit après validation.
- **Décisions préalables** : DF6.1 manifest nu ou WXT (à trancher) ; DF6.2 jeton obligatoire sur toutes les routes si l'écoute n'est pas `127.0.0.1` (défaut : oui).
- **Risques** : le devcontainer n'est pas `localhost` vu de Windows ; CSP des sites.
- **État** : [ ] à faire

---

## Idées parquées

Tout besoin apparu hors de l'étape en cours s'inscrit ici, en une ligne (date, besoin, étape où le reprendre), au lieu d'entrer dans le code. Vidé ou promu en étape lors d'une revue de feuille de route.

_(vide)_

## Reporté volontairement

Accroches additives prévues par le plan (marge de revente, options A/B, achats de l'étape 10, recherche d'entreprises F3, capture et import F4–F6, exports émis F1–F2, zones hiérarchiques, multi-utilisateur, bureau) : liste maîtresse dans `DATA_MODEL.md` §9 ; le modèle v1 n'en contient aucune colonne.
