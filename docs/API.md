# API

Conventions de l'API HTTP servie par `api/` et tableau des routes prévues. Chaque ligne du tableau est marquée « prévue (étape N) » et passe à « livrée (étape N) » dans la session qui la livre ; à l'étape 1 (2026-10-09) seule `GET /health` est livrée. Détail des tables : `DATA_MODEL.md` ; flux d'une requête : `ARCHITECTURE.md` §3. Le contrat exécutable est `api/openapi.json` (instantané de `/openapi.json` produit par FastAPI, écrit par `ffe openapi`, ARCHITECTURE §4) ; ce document fixe les règles que ce contrat doit respecter.

## Conventions

### Adresse et sécurité

- Préfixe `/api/v1`. La version ne change que sur rupture du contrat consommé par un client externe (extension) ; front et API sont livrés ensemble.
- Écoute `127.0.0.1:8000` seulement. CORS fermé (aucun en-tête `Access-Control-*`) jusqu'à l'extension, puis ouvert à sa seule origine, avec jeton local dans `Authorization: Bearer`.
- Aucune authentification en v1 (outil mono-utilisateur local). Vérification de l'en-tête `Host` contre le DNS rebinding : à trancher à l'étape 4.

### Nommage

- Ressources au **pluriel** et en kebab-case dans l'URL (`/clients`, `/project-items`). Les tables restent au singulier : une ligne est une entité, une URL de collection désigne l'ensemble ; les deux conventions coexistent sans mapping, le routeur étant la seule frontière.
- Identifiants entiers (`id INTEGER PRIMARY KEY`) dans l'URL : `/clients/{id}`, validés `int ≥ 1`, sinon 422.
- Imbrication une seule fois : `/projects/{id}/zones` pour lister et créer dans un projet ; ensuite accès plat `/zones/{id}`.
- Actions non CRUD : `POST …/{id}/<verbe>` (`archive`, `unarchive`, `status`, `reorder`, `backup`).

### Verbes

| Verbe | Usage | Réponse |
|---|---|---|
| `GET /x` | Liste ; exclut les archivés sauf `?includeArchived=true` | 200, tableau (ou `{items, total}` sur le catalogue) |
| `GET /x/{id}` | Lecture | 200, DTO |
| `POST /x` | Création | 201, DTO créé |
| `PATCH /x/{id}` | Mise à jour partielle : champs absents inchangés, `null` explicite = effacement | 200, DTO |
| `PUT /x` | Remplacement en bloc, seulement pour les budgets | 200 |
| `DELETE /x/{id}` | Suppression physique, seulement là où `DATA_MODEL.md` l'autorise : brouillon sans événement, zone vide, placement (les lignes de budget se suppriment par le `PUT` en bloc) | 204 |
| `POST /x/{id}/archive` · `unarchive` | Archivage (`archivedAt`) ; jamais `DELETE` pour archiver ; parent archivé → enfants en lecture seule | 200, DTO |
| `POST /project-items/{id}/status` | `{status, note?}` ; transition vérifiée par le service, événement écrit ; jamais de `status` dans un `PATCH` | 200, DTO |

### Corps JSON

- `application/json`, UTF-8, clés **camelCase** (`unitCostCents`, `vatRateBp`). Snake_case nulle part dans le contrat.
- Montants et taux en entiers : `*Cents` (HT), `*Bp` (points de base, 10 000 = 100 %), `*Milli` (millièmes d'unité), `fxRateMicro` (1 000 000 = parité EUR) ; `currency` ISO 4217. Aucun décimal, aucun flottant : le front formate, `money.py` calcule.
- Dates : `*At` = horodatage ISO-8601 UTC avec `Z` (`2026-10-09T14:03:00Z`), posé par le service, jamais fourni par le client ; `*On` = date civile `YYYY-MM-DD`.
- Enums : chaînes minuscules en anglais (`draft`, `approved`, `piece`) ; libellés français côté UI.
- Champs calculés (totaux, TTC, reste à engager) : jamais dans les DTO de ressource ; uniquement dans `GET /projects/{id}/summary`.

### Codes de réponse

| Code | Quand |
|---|---|
| 200 | Lecture, mise à jour, action |
| 201 | Création ; le corps est la ressource créée |
| 204 | Suppression physique |
| 400 | Corps illisible (JSON invalide, `Content-Type` manquant) |
| 404 | Introuvable (un archivé reste lisible par id) |
| 409 | Conflit métier : doublon, FK `RESTRICT`, transition interdite, parent archivé |
| 413 | Fichier au-delà de la limite (20 Mo, `POST /files`, étape 6b) |
| 422 | Validation champ par champ (Pydantic ou règle de service portant sur un champ) |
| 500 | Erreur interne, loguée avec sa trace, sans détail au client |

### Format d'erreur

```json
{ "code": "validation_error", "message": "Données invalides",
  "details": [{ "field": "siren", "message": "9 chiffres attendus" }] }
```

- `code` fait partie du contrat : `validation_error`, `not_found`, `conflict`, `duplicate`, `parent_archived`, `invalid_transition`, `payload_too_large`, `internal_error`.
- `details` est vide hors validation. `field` est le nom camelCase du champ JSON, ou un chemin pointé pour un champ imbriqué (`placements.0.qtyMilli`).
- Messages en français (`i18n/fr.py`) ; jamais de stack ni de SQL.
- Doublon bloqué par une ressource archivée : même format, `code: "conflict"`, plus `"archivedId": 42` au premier niveau ; le front propose « Restaurer ».
- Doublon d'une ressource active (`client`, `supplier` : nom normalisé identique) : 409 `code: "duplicate"` avec `"existingId": 42`, sauf si la requête porte `?force=true` (création acceptée, 201) ; le front propose « Ouvrir l'existant » ou « Créer quand même ».

### Listes, pagination, filtres

- Pagination **seulement sur le catalogue** (`/products`, `/suppliers`, `/manufacturers`) : `?q=&limit=50&offset=0`, `limit` ≤ 200, réponse `{ "items": [...], "total": n }`. Les autres listes (clients, projets, zones, lignes d'un projet, budgets) renvoient un tableau complet : le volume visé ne justifie pas plus.
- Filtres : paramètres de requête validés par Pydantic (`?zoneId=3&status=approved`). Tri : liste blanche (`?sort=name`, `?sort=-updatedAt`). `q` : recherche par mot, insensible à la casse et aux accents, sur nom et références.

### En-têtes

- Requête : `Content-Type: application/json` obligatoire sur `POST`/`PATCH`/`PUT`, sauf `multipart/form-data` pour `POST /files`.
- Réponse : `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`. Pas d'`ETag` ni d'`If-Match` en v1 (mono-utilisateur).
- Fichiers : limite 20 Mo (défaut, étape 6b), dédoublonnage par `sha256` ; `GET /files/{id}/content` renvoie le binaire avec son `Content-Type` d'origine.

## Routes prévues

| Ressource | Routes (sous `/api/v1`) | Statut |
|---|---|---|
| Système | `GET /health` → `{ok, dbPath, isDevDb, schemaRevision, lastBackupAt, backupDirOk}` (`operationId: getHealth` ; `dbPath`/`schemaRevision` à `null` sans base, c'est-à-dire seulement lors de la génération du contrat) | livrée (étape 1, enrichie étape 3) |
| Clients | `GET/POST /clients` · `GET/PATCH /clients/{id}` · `POST /clients/{id}/archive` · `POST /clients/{id}/unarchive` | prévue (étape 4) |
| Réglages | `GET/PATCH /settings` (ressource unique, sans id) | prévue (étape 9) |
| Fournisseurs | `GET/POST /suppliers` (paginé) · `GET/PATCH /suppliers/{id}` · `POST …/archive` · `POST …/unarchive` | prévue (étape 6a) |
| Fabricants | `GET/POST /manufacturers` (paginé) · `GET/PATCH /manufacturers/{id}` · `POST …/archive` · `POST …/unarchive` | prévue (étape 6a) |
| Catégories | `GET /categories` (arbre 2 niveaux) · `POST /categories` · `PATCH /categories/{id}` · `POST /categories/{id}/archive` · `unarchive` (sauf `DIV`) | prévue (étape 6a) |
| Produits | `GET/POST /products` (paginé) · `GET/PATCH /products/{id}` · `POST …/archive` · `POST …/unarchive` | prévue (étape 6b) |
| Fichiers | `POST /files` (multipart) · `GET /files/{id}/content` · `POST /products/{id}/files` `{fileId, kind, isPrimary}` · `DELETE /products/{id}/files/{fileId}` | prévue (étape 6b) |
| Projets | `GET/POST /projects` · `GET/PATCH /projects/{id}` · `POST /projects/{id}/status` `{status}` (prospect/active/delivered/closed/cancelled ; pas d'archivage : `closed`/`cancelled` en tiennent lieu, DATA_MODEL §4.3) | prévue (étape 6c) |
| Zones | `GET/POST /projects/{id}/zones` · `GET/PATCH/DELETE /zones/{id}` (DELETE si vide) · `POST /zones/{id}/archive` · `unarchive` · `POST /projects/{id}/zones/reorder` | prévue (étape 6c) |
| Lignes | `GET/POST /projects/{id}/project-items` (filtres `zoneId`, `status`, `categoryId`, `supplierId`, `kind`, `q`) · `GET/PATCH/DELETE /project-items/{id}` (DELETE si brouillon sans événement) | prévue (étape 7a) |
| Placements | `POST /project-items/{id}/placements` · `PATCH/DELETE /placements/{id}` | prévue (étape 7a) |
| Fichiers de ligne | `POST /project-items/{id}/files` `{fileId, kind, isPrimary}` · `DELETE /project-items/{id}/files/{fileId}` | prévue (étape 7a) |
| Statuts et journal | `POST /project-items/{id}/status` `{status, note?}` · `GET /project-items/{id}/events` | prévue (étape 7a ; UI à l'étape 7c) |
| Budgets | `GET/PUT /projects/{id}/budget-lines` (remplacement en bloc) | prévue (étape 8) |
| Synthèse | `GET /projects/{id}/summary` (Budget / Prescrit / Validé / Reste par zone et catégorie, calculé par `money.py`) · `GET /projects/{id}/alerts` | prévue (étape 8) |
| Sauvegarde | `POST /system/backup` | prévue (étape 9) |
| Achats | `/quotes`, `/purchase-orders`, `/deliveries`, `/supplier-invoices` (forme à trancher à l'étape 10) | prévue (étape 10) |
| Exports xlsx | `GET /projects/{id}/exports/schedule.xlsx?variant=&groupBy=` | prévue (étape F1) |
| Exports PDF | `GET /projects/{id}/exports/book.pdf` · `GET /purchase-orders/{id}/pdf` | prévue (étape F2) |
| Entreprises | `GET /companies/search?q=&country=FR` · `POST /companies/vat-check` `{vatNumber}` (proxy avec cache ; le front n'appelle jamais l'extérieur) | prévue (étape F3) |
| Imports | `POST /imports/products/preview` (multipart + `supplierId` + mapping) · `POST /imports/products/commit` | prévue (étape F4) |
| Captures | `GET /captures/preview?url=` · `POST /captures` (jeton local, CORS limité à l'extension) | prévue (étapes F5–F6) |

Toute route livrée hors de ce tableau, ou qui s'écarte d'une convention ci-dessus, se justifie dans `JOURNAL.md` et met ce fichier à jour dans le même commit.
