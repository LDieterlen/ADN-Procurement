# API

Conventions de l'API HTTP servie par `api/` et tableau des routes. Chaque ligne du tableau est marquée « prévue (étape N) » ou « livrée (étape N) » ; le recentrage du 2026-10-12 (ADR-0013) a retiré les routes des devis, bons de commande, réceptions, factures, import de tarifs, alertes et tableau de bord (tag git `v0-complet`). Détail des tables : `DATA_MODEL.md` ; flux d'une requête : `ARCHITECTURE.md` §3. Le contrat exécutable est `api/openapi.json` (instantané de `/openapi.json` produit par FastAPI, écrit par `ffe openapi`, ARCHITECTURE §4) ; ce document fixe les règles que ce contrat doit respecter.

## Conventions

### Adresse et sécurité

- Préfixe `/api/v1`. La version ne change que sur rupture du contrat consommé par un client externe (extension) ; front et API sont livrés ensemble.
- Écoute `127.0.0.1:8000` seulement. CORS fermé (aucun en-tête `Access-Control-*`) jusqu'à l'extension, puis ouvert à sa seule origine, avec jeton local dans `Authorization: Bearer`.
- Aucune authentification en v1 (outil mono-utilisateur local). En-tête `Host` vérifié contre le DNS rebinding (D4.5, étape 4) : seuls `127.0.0.1` et `localhost` (avec ou sans port) sont acceptés, toute autre valeur reçoit 400 avant tout routage.

### Nommage

- Ressources au **pluriel** et en kebab-case dans l'URL (`/clients`, `/project-items`). Les tables restent au singulier : une ligne est une entité, une URL de collection désigne l'ensemble ; les deux conventions coexistent sans mapping, le routeur étant la seule frontière.
- Identifiants entiers (`id INTEGER PRIMARY KEY`) dans l'URL : `/clients/{id}`, validés `int ≥ 1`, sinon 422.
- Imbrication une seule fois : `/projects/{id}/locations` pour lister et créer dans un projet ; ensuite accès plat `/locations/{id}`.
- Actions non CRUD : `POST …/{id}/<verbe>` (`archive`, `unarchive`, `status`, `reorder`, `backup`).

### Verbes

| Verbe | Usage | Réponse |
|---|---|---|
| `GET /x` | Liste ; exclut les archivés sauf `?includeArchived=true` | 200, tableau (ou `{items, total}` sur le catalogue) |
| `GET /x/{id}` | Lecture | 200, DTO |
| `POST /x` | Création | 201, DTO créé |
| `PATCH /x/{id}` | Mise à jour partielle : champs absents inchangés, `null` explicite = effacement | 200, DTO |
| `PUT /x` | Remplacement en bloc, seulement pour les budgets | 200 |
| `DELETE /x/{id}` | Suppression physique, seulement là où `DATA_MODEL.md` l'autorise : article « à chiffrer » sans événement, localisation vide, implantation (les lignes de budget se suppriment par le `PUT` en bloc) | 204 |
| `POST /x/{id}/archive` · `unarchive` | Archivage (`archivedAt`) ; jamais `DELETE` pour archiver ; parent archivé → enfants en lecture seule | 200, DTO |
| `POST /project-items/{id}/status` | `{status, note?}` ; changement libre (ADR-0013), même statut → 409, événement écrit ; jamais de `status` dans un `PATCH` | 200, DTO |

### Corps JSON

- `application/json`, UTF-8, clés **camelCase** (`unitCostCents`, `vatRateBp`). Snake_case nulle part dans le contrat.
- Montants et taux en entiers : `*Cents` (HT), `*Bp` (points de base, 10 000 = 100 %), `*Milli` (millièmes d'unité), `fxRateMicro` (1 000 000 = parité EUR) ; `currency` ISO 4217. Aucun décimal, aucun flottant : le front formate, `money.py` calcule.
- Dates : `*At` = horodatage ISO-8601 UTC avec `Z` (`2026-10-09T14:03:00Z`), posé par le service, jamais fourni par le client ; `*On` = date civile `YYYY-MM-DD`.
- Enums : chaînes minuscules en anglais (`to_quote`, `approved`, `edition`) ; libellés français côté UI.
- Champs calculés (totaux, reste, parts) : jamais dans les DTO de ressource ; uniquement dans `GET /projects/{id}/summary` et les trois chiffres de `GET /projects` (`budgetCents`, `specifiedCents`, `itemCount`).

### Codes de réponse

| Code | Quand |
|---|---|
| 200 | Lecture, mise à jour, action |
| 201 | Création ; le corps est la ressource créée |
| 204 | Suppression physique |
| 400 | Corps illisible (JSON invalide, `Content-Type` manquant) |
| 404 | Introuvable (un archivé reste lisible par id) |
| 409 | Conflit métier : doublon, FK `RESTRICT`, transition interdite, parent archivé |
| 413 | Fichier au-delà de la limite (`FFE_MAX_UPLOAD_BYTES`, 20 Mo par défaut, `POST /files`) ; code `payload_too_large` |
| 422 | Validation champ par champ (Pydantic ou règle de service portant sur un champ) |
| 500 | Erreur interne, loguée avec sa trace, sans détail au client |

### Format d'erreur

```json
{ "code": "validation_error", "message": "Données invalides",
  "details": [{ "field": "siren", "message": "9 chiffres attendus" }] }
```

- `code` fait partie du contrat : `validation_error`, `not_found`, `conflict`, `duplicate`, `payload_too_large`, `internal_error`.
- `details` est vide hors validation. `field` est le nom camelCase du champ JSON, ou un chemin pointé pour un champ imbriqué (`placements.0.qtyMilli`).
- Messages en français (`i18n/fr.py`) ; jamais de stack ni de SQL.
- Doublon bloqué par une ressource archivée : même format, `code: "conflict"`, plus `"archivedId": 42` au premier niveau ; le front propose « Restaurer ».
- Doublon d'une ressource active (`client`, `supplier` : nom normalisé identique) : 409 `code: "duplicate"` avec `"existingId": 42`, sauf si la requête porte `?force=true` (création acceptée, 201) ; le front propose « Ouvrir l'existant » ou « Créer quand même ».

### Listes, pagination, filtres

- Pagination **seulement sur le catalogue** (`/products`, `/suppliers`, `/manufacturers`) : `?q=&limit=50&offset=0`, `limit` ≤ 200, réponse `{ "items": [...], "total": n }`. Les autres listes (clients, types, projets, localisations, articles d'un projet, budgets) renvoient un tableau complet : le volume visé ne justifie pas plus.
- Filtres : paramètres de requête validés par Pydantic (`?locationId=3&status=approved`). `q` : recherche par mot, insensible à la casse et aux accents, sur nom, représentant et références.

### En-têtes

- Requête : `Content-Type: application/json` obligatoire sur `POST`/`PATCH`/`PUT`, sauf `multipart/form-data` pour `POST /files`.
- Réponse : `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`. Pas d'`ETag` ni d'`If-Match` en v1 (mono-utilisateur).
- Fichiers : limite 20 Mo (défaut, étape 6b), dédoublonnage par `sha256` ; `GET /files/{id}/content` renvoie le binaire avec son `Content-Type` d'origine.

## Routes

| Ressource | Routes (sous `/api/v1`) | Statut |
|---|---|---|
| Système | `GET /health` → `{ok, dbPath, isDevDb, schemaRevision, lastBackupAt, backupDir, backupDirOk, lastQuickCheck, logPath}` (`getHealth`) · `POST /system/backup` → `{path, copiedTo, copyError, quickCheck, at}` (`createBackup`) | livrée (étapes 1, 9) |
| Réglages | `GET /settings` · `PATCH /settings` (`projectCodePrefix` majuscules `A-Z0-9-` ≤ 10, `agencyName`, `agencyAddress`, `agencyEmail`, `agencyPhone` ; `baseCurrency`, `seedCategoryVersion` en lecture seule ; textes vides → `null`) (`getSettings`, `updateSettings`) | livrée (étape 9, allégée étape 12) |
| Clients | `GET /clients?q=&includeArchived=` · `POST /clients?force=` · `GET/PATCH /clients/{id}` · `POST …/archive` · `unarchive` (`listClients`, `createClient`, `getClient`, `updateClient`, `archiveClient`, `unarchiveClient`) | livrée (étape 4) |
| Fournisseurs | `GET /suppliers?q=&includeArchived=&limit=50&offset=0` → `{items, total}` (`q` sur nom et représentant) · `POST /suppliers?force=` (`name`, `contactName`, `email`, `phone`, `website`, `currency`, `defaultDiscountBp`, `notes`) · `GET/PATCH /suppliers/{id}` · `POST …/archive` · `unarchive` (`listSuppliers` …) | livrée (étape 6a, allégée étape 12) |
| Fabricants | `GET /manufacturers?q=&includeArchived=&limit=&offset=` → `{items, total}` · `POST /manufacturers?force=` · `GET/PATCH /manufacturers/{id}` · `POST …/archive` · `unarchive` (`listManufacturers` …) | livrée (étape 6a) |
| Types de produit | `GET /categories?includeArchived=` (par `sortOrder`) · `POST /categories` `{code (2-4 majuscules, unique), name (unique), sortOrder}` · `GET /categories/{id}` · `PATCH /categories/{id}` (`name`, `sortOrder` ; le code est immuable) · `POST …/archive` · `unarchive` (`listCategories` …) | livrée (étape 6a, un seul niveau étape 12) |
| Produits | `GET /products?q=&categoryId=&manufacturerId=&supplierId=&includeArchived=&limit=&offset=` → `{items, total}` (`files[]` inclus) · `POST /products?force=` (`name`, `categoryId`, `manufacturerId`, `reference`, `supplierId`, `listPriceCents`, `currency`, `dimensions`, `finish`, `sourceUrl`, `notes` ; doublon = même fabricant + référence) · `GET/PATCH /products/{id}` · `POST …/archive` · `unarchive` (`listProducts` …) | livrée (étape 6b, allégée étape 12) |
| Fichiers | `POST /files` (multipart `file` ; 201 nouveau, 200 si le sha256 existe ; 422 MIME refusé, 413 au-delà de 20 Mo) · `GET /files/{id}/content` · `POST /products/{id}/files` `{fileId, kind, isPrimary, caption?, sortOrder?}` · `PATCH /products/{id}/files/{fileId}` (+ `licenseNote`) · `DELETE /products/{id}/files/{fileId}` (`uploadFile`, `getFileContent`, `attachProductFile`, `updateProductFile`, `detachProductFile`) | livrée (étape 6b) |
| Projets | `GET /projects?status=&clientId=` → `ProjectListRead[]` (projet + `budgetCents`, `specifiedCents`, `itemCount` calculés, tri `code` décroissant) · `POST /projects` `{name, clientId, code?, siteAddress?, dueOn?, notes?, globalBudgetCents?}` (code absent → `<préfixe>AAAA-NNN` ; budget → ligne `global`) · `GET/PATCH /projects/{id}` (409 si clos) · `POST /projects/{id}/status` `{status}` (`listProjects`, `createProject`, `getProject`, `updateProject`, `changeProjectStatus`) | livrée (étape 6c, revue étape 12) |
| Localisations | `GET /projects/{id}/locations?includeArchived=` · `POST /projects/{id}/locations` `{code, name, zone?, level?, multiplier, sortOrder?}` (code unique par projet, insensible à la casse) · `POST /projects/{id}/locations/reorder` `{locationIds}` · `GET/PATCH /locations/{id}` · `DELETE /locations/{id}` → 204 (vide ; implantations et budgets en RESTRICT → 409) · `POST /locations/{id}/archive` · `unarchive` ; refusé (409) sur un projet clos (`listLocations`, `createLocation`, `reorderLocations`, `getLocation`, `updateLocation`, `deleteLocation`, `archiveLocation`, `unarchiveLocation`) | livrée (étape 12, remplace les zones) |
| Articles | `GET /projects/{id}/project-items?locationId=&status=&categoryId=&supplierId=&kind=&q=` · `POST /projects/{id}/project-items` (`kind` `product` \| `fee` ; depuis `productId` la fiche et le prix sont copiés ; libre : `categoryId` + `name`, `addToCatalogue` (défaut vrai) crée ou lie le produit ; `fxRateMicro` requis hors EUR sauf taux déjà connu dans le projet ; `placements[{locationId?, qtyMilli, sortOrder}]` absent → une implantation non affectée ; `fee` : `supplierId` requis, ni type ni implantation ; `itemCode` absent → `<LOC>-<TYPE>-NN` ou `FR-NN`) · `GET/PATCH /project-items/{id}` (fiche, famille, usage, prix, devise, taux, remise, devis ; `categoryId` en `to_quote` renumérote ; `itemCode` en `to_quote` seulement ; jamais `status`) · `DELETE /project-items/{id}` → 204 (`to_quote` sans autre événement que `created`) ; `ProjectItemRead.catalogueImageFileId` = photo principale du produit lié, repli d'affichage quand l'article n'a pas la sienne ; la création depuis un produit joint sa photo principale à l'article (`listProjectItems`, `createProjectItem`, `getProjectItem`, `updateProjectItem`, `deleteProjectItem`) | livrée (étape 7a, réécrite étape 12) |
| Implantations | `POST /project-items/{id}/placements` `{locationId?, qtyMilli, sortOrder}` (localisation du projet et active, une par localisation ; 409 sur un `fee`) · `PATCH /placements/{id}` · `DELETE /placements/{id}` (409 sur la dernière) ; réponses = l'article complet (`addPlacement`, `updatePlacement`, `deletePlacement`) | livrée (étape 7a) |
| Fichiers d'article | `POST /project-items/{id}/files` `{fileId, kind: image \| drawing \| other, isPrimary, caption?, sortOrder}` · `PATCH …/files/{fileId}` · `DELETE …/files/{fileId}` (`attachProjectItemFile`, `updateProjectItemFile`, `detachProjectItemFile`) | livrée (étape 7a) |
| Statut et journal | `POST /project-items/{id}/status` `{status, note?}` (libre entre les sept statuts, 409 si identique, note facultative) · `GET /project-items/{id}/events` (`changeProjectItemStatus`, `listProjectItemEvents`) | livrée (étape 7a, libre étape 12) |
| Budgets | `GET /projects/{id}/budget-lines` · `PUT /projects/{id}/budget-lines` `{lines: [{scope: global \| location \| zone \| family \| supplier, locationId?, zone?, family?, supplierId?, amountCents, notes?}]}` : remplacement en bloc ; la référence doit correspondre au périmètre (422 `lines.<i>.scope`), localisation du projet (422 `lines.<i>.locationId`), famille connue, fournisseur existant ; même périmètre deux fois → 409 ; 409 sur un projet clos (`listBudgetLines`, `putBudgetLines`) | livrée (étape 8, périmètres étape 12) |
| Synthèse | `GET /projects/{id}/summary?locationId=&zone=&family=&categoryId=&supplierId=` → `{lines[{projectItemId, itemCode, status, kind, counted, totalQtyMilli, netUnitCents, netUnitEurCents, totalHtCents, placements[{placementId, totalHtCents}]}], budgetCents, specifiedCents, quotedCents, approvedCents, remainingCents, alert, byStatus[{status, count, amountCents, shareBp}], byLocation[], byZone[], byFamily[], byType[], bySupplier[]}` — chaque ligne de compilation : `{key, label, budgetCents, specifiedCents, quotedCents, approvedCents, remainingCents, alert}` ; tout par `money.py` (`getProjectSummary`) | livrée (étape 7a, réécrite étape 12) |
| Exports PDF | `GET /projects/{id}/exports/sheets.pdf` → fiches de prescription (couverture, liste par localisation, une fiche par article et par implantation : photo, dessin, fabricant, nom, référence, fournisseur, dimensions, finitions, quantité, commentaires, lien, représentant, téléphone, email, diffusion, validation ; jamais de prix ; frais et annulés exclus) ; pose l'indice (`project_file.indice`, `project_item.indice`), nom `<code>-fiches-<indice>-<date>.pdf` · `GET /projects/{id}/exports/list.pdf` → listing paysage (photo, code, type, désignation, fabricant · réf., fournisseur et contact, dimensions · finitions, famille · usage, quantité, montant HT, état, indice) · `GET /projects/{id}/exports` → `[{id, fileId, kind, issuedAt, indice, originalName, sizeBytes}]` (`exportSheets`, `exportList`, `listProjectExports`) | livrée (étape F2, revue étape 12) |
| Exports xlsx | listing et budget en xlsx | parquée (ADR-0013 : PDF seulement pour l'instant) |
| Entreprises | `GET /companies/search?q=&country=FR` · `POST /companies/vat-check` | prévue (étape F3) |
| Coller une adresse | `GET /captures/preview?url=` → `{url, name, brand, reference, imageUrl, priceCents, currency, description, source: json-ld \| opengraph \| title}` (lecture d'une page par le serveur, 10 s, 3 Mo, http/https ; 422 `url` : adresse invalide, page injoignable ou en erreur, pas une page web, aucune fiche lisible ; rien n'est enregistré) · `POST /captures/image` `{url}` → 201 `FileRead` (image téléchargée par le serveur, reconnue par ses octets, conservée comme un envoi avec `sourceUrl`) (`previewCapture`, `captureImage`) | livrée (étape F5, ADR-0014) |
| Extension navigateur | `POST /captures` depuis l'extension, jeton local | prévue (étape F6) |

Toute route livrée hors de ce tableau, ou qui s'écarte d'une convention ci-dessus, se justifie dans `JOURNAL.md` et met ce fichier à jour dans le même commit.
