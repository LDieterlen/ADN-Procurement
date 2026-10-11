# API

Conventions de l'API HTTP servie par `api/` et tableau des routes prévues. Chaque ligne du tableau est marquée « prévue (étape N) » et passe à « livrée (étape N) » dans la session qui la livre ; à l'étape 1 (2026-10-09) seule `GET /health` est livrée. Détail des tables : `DATA_MODEL.md` ; flux d'une requête : `ARCHITECTURE.md` §3. Le contrat exécutable est `api/openapi.json` (instantané de `/openapi.json` produit par FastAPI, écrit par `ffe openapi`, ARCHITECTURE §4) ; ce document fixe les règles que ce contrat doit respecter.

## Conventions

### Adresse et sécurité

- Préfixe `/api/v1`. La version ne change que sur rupture du contrat consommé par un client externe (extension) ; front et API sont livrés ensemble.
- Écoute `127.0.0.1:8000` seulement. CORS fermé (aucun en-tête `Access-Control-*`) jusqu'à l'extension, puis ouvert à sa seule origine, avec jeton local dans `Authorization: Bearer`.
- Aucune authentification en v1 (outil mono-utilisateur local). En-tête `Host` vérifié contre le DNS rebinding (D4.5, étape 4) : seuls `127.0.0.1` et `localhost` (avec ou sans port) sont acceptés, toute autre valeur reçoit 400 avant tout routage.

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
| 413 | Fichier au-delà de la limite (`FFE_MAX_UPLOAD_BYTES`, 20 Mo par défaut, `POST /files`) ; code `payload_too_large` |
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
| Système | `GET /health` → `{ok, dbPath, isDevDb, schemaRevision, lastBackupAt, backupDir, backupDirOk, lastQuickCheck, logPath}` (`operationId: getHealth` ; `dbPath`/`schemaRevision` à `null` sans base, c'est-à-dire seulement lors de la génération du contrat ; étape 9 : `backupDir` (chemin), `lastQuickCheck` (verdict du dernier `quick_check` : démarrage ou sauvegarde), `logPath`) | livrée (étape 1, enrichie étapes 3 et 9) |
| Clients | `GET /clients?q=&includeArchived=` · `POST /clients?force=` · `GET/PATCH /clients/{id}` · `POST /clients/{id}/archive` · `POST /clients/{id}/unarchive` (`operationId` : `listClients`, `createClient`, `getClient`, `updateClient`, `archiveClient`, `unarchiveClient`) | livrée (étape 4) |
| Réglages | `GET /settings` · `PATCH /settings` (ressource unique, sans id ; champs : `defaultVatBp`, `defaultContingencyBp`, `projectCodePrefix` (majuscules, `A-Z0-9-`, 10 max), `agencyName`, `agencyAddress`, `agencyEmail`, `agencyPhone`, `agencySiret` (14 chiffres, espaces retirés), `agencyVatNumber` (`FR` + 2 à 13 caractères, espaces retirés) ; `baseCurrency` et `seedCategoryVersion` en lecture seule ; 422 champ par champ ; les textes optionnels vides deviennent `null`) (`getSettings`, `updateSettings`) | livrée (étape 9) |
| Fournisseurs | `GET /suppliers?q=&includeArchived=&limit=50&offset=0` → `{items, total}` · `POST /suppliers?force=` · `GET/PATCH /suppliers/{id}` · `POST …/archive` · `POST …/unarchive` (`listSuppliers`, `createSupplier`, `getSupplier`, `updateSupplier`, `archiveSupplier`, `unarchiveSupplier`) | livrée (étape 6a) |
| Fabricants | `GET /manufacturers?q=&includeArchived=&limit=50&offset=0` → `{items, total}` · `POST /manufacturers?force=` · `GET/PATCH /manufacturers/{id}` · `POST …/archive` · `POST …/unarchive` (`listManufacturers` …) | livrée (étape 6a) |
| Catégories | `GET /categories?includeArchived=` (arbre à 2 niveaux rendu à plat : niveau 1 par `sortOrder`, chacun suivi de ses enfants) · `POST /categories` (`code` requis sans `parentId`, interdit avec) · `GET /categories/{id}` · `PATCH /categories/{id}` (`name`, `sortOrder` seulement) · `POST /categories/{id}/archive` (refusé : `DIV`, parent avec enfants actifs) · `unarchive` (refusé si le parent est archivé) (`listCategories` …) | livrée (étape 6a) |
| Produits | `GET /products?q=&categoryId=&manufacturerId=&supplierId=&includeArchived=&limit=&offset=` → `{items, total}` (chaque produit porte `files[]`, D6b.7) · `POST /products?force=` (doublon = même `manufacturerId` + `manufacturerRef`, D6b.9) · `GET/PATCH /products/{id}` · `POST …/archive` · `POST …/unarchive` (`listProducts` …) | livrée (étape 6b) |
| Fichiers | `POST /files` (multipart `file` ; 201 nouveau, 200 si le sha256 existe déjà ; 422 `file` si MIME refusé, 413 au-delà de `FFE_MAX_UPLOAD_BYTES`) · `GET /files/{id}/content` (`Cache-Control: immutable`) · `POST /products/{id}/files` `{fileId, kind, isPrimary, caption?, sortOrder?}` (une seule principale, image seulement) · `PATCH /products/{id}/files/{fileId}` · `DELETE /products/{id}/files/{fileId}` (`unlink` si plus aucune jointure) ; réponses = le produit complet (`uploadFile`, `getFileContent`, `attachProductFile`, `updateProductFile`, `detachProductFile`) | livrée (étape 6b) |
| Projets | `GET /projects?status=&clientId=` (tri `code` décroissant) · `POST /projects` (`code` absent → `<préfixe>AAAA-NNN` généré, D6c.1 ; `defaultVatBp` absent → `setting`) · `GET/PATCH /projects/{id}` (409 si `closed`/`cancelled` : rouvrir par le statut) · `POST /projects/{id}/status` `{status}` libre entre les cinq (`listProjects`, `createProject`, `getProject`, `updateProject`, `changeProjectStatus`) | livrée (étape 6c) |
| Zones | `GET /projects/{id}/zones?includeArchived=` · `POST /projects/{id}/zones` (`code` unique par projet, insensible à la casse ; `sortOrder` absent → après la dernière) · `POST /projects/{id}/zones/reorder` `{zoneIds}` (exactement les zones actives, 422 sinon) · `GET/PATCH /zones/{id}` · `DELETE /zones/{id}` → 204 (vide seulement ; placements 7a et budgets 8 en RESTRICT) · `POST /zones/{id}/archive` · `unarchive` ; tout est refusé (409) sur un projet clos (`listZones`, `createZone`, `reorderZones`, `getZone`, `updateZone`, `deleteZone`, `archiveZone`, `unarchiveZone`) | livrée (étape 6c) |
| Lignes | `GET /projects/{id}/project-items?zoneId=&status=&categoryId=&supplierId=&kind=&q=` · `POST /projects/{id}/project-items` (depuis `productId` : champs absents copiés, prix TTC ramené en HT, `fxRateMicro` obligatoire pour une devise ≠ EUR sauf taux déjà saisi dans le projet ; ou libre avec `categoryId` + `name` ; `itemCode` absent → `<CAT>-NNN`) · `GET/PATCH /project-items/{id}` (`itemCode` en brouillon seulement ; jamais `status`) · `DELETE /project-items/{id}` → 204 (brouillon sans autre événement que `created`) · `POST /project-items/{id}/replace` `{productId, …}` → 201 nouvelle ligne (depuis `approved`) · `POST /project-items/{id}/refresh` (D7.4, re-copie du prix catalogue, journalisée) (`listProjectItems`, `createProjectItem`, `getProjectItem`, `updateProjectItem`, `deleteProjectItem`, `replaceProjectItemProduct`, `refreshProjectItemFromCatalogue`) | livrée (étape 7a) |
| Placements | `POST /project-items/{id}/placements` `{zoneId?, qtyMilli, sortOrder?, notes?}` (zone du projet et active, une par zone, multiple de 1 000 pour les unités à la pièce) · `PATCH /placements/{id}` · `DELETE /placements/{id}` (409 sur le dernier) ; réponses = la ligne complète (`addPlacement`, `updatePlacement`, `deletePlacement`) | livrée (étape 7a) |
| Fichiers de ligne | `POST /project-items/{id}/files` `{fileId, kind, isPrimary, caption?, sortOrder?}` · `PATCH …/files/{fileId}` · `DELETE …/files/{fileId}` (mêmes règles que les fichiers produit) (`attachProjectItemFile`, `updateProjectItemFile`, `detachProjectItemFile`) | livrée (étape 7a) |
| Statuts et journal | `POST /project-items/{id}/status` `{status, note?}` (table `transitions.py` ; 409 typé sur transition interdite, 422 champ par champ sur précondition manquante, note obligatoire pour `cancelled`, la réouverture et le retour depuis `approved`) · `GET /project-items/{id}/events` (`changeProjectItemStatus`, `listProjectItemEvents`) | livrée (étape 7a ; UI à l'étape 7c) |
| Budgets | `GET /projects/{id}/budget-lines` · `PUT /projects/{id}/budget-lines` `{lines: [{zoneId?, categoryId?, amountCents, notes?}]}` : remplacement en bloc, une ligne par périmètre (projet, zone, catégorie) sinon 409 `conflict`, zone ou catégorie inconnue → 422 `lines.<i>.zoneId`, anti double-comptage parent/enfant de catégorie pour une même zone → 422 ; refusé (409) sur un projet clos (`listBudgetLines`, `putBudgetLines`) | livrée (étape 8) |
| Alertes | `GET /projects/{id}/alerts` → `[{kind: budget_90 \| budget_100 \| order_overdue, message, zoneId?, categoryId?, projectItemId?}]` : seuils D8.4 (90 % orange, 100 % rouge) sur le budget global et par zone, lignes dont `orderBy` est dépassé (`listProjectAlerts`) | livrée (étape 8) |
| Tableau de bord | `GET /dashboard` → projets non clos : `code`, `name`, `status`, `clientName`, `dueOn`, `budgetCents`, `specifiedCents`, `approvedCents`, `remainingCents`, `alert`, `draftLines`, `onHoldLines`, `overdueLines` (`getDashboard`) | livrée (étape 8) |
| Synthèse | `GET /projects/{id}/summary` — étape 7a : montants par ligne (`totalQtyMilli`, `netUnitCents`, `netUnitEurCents`, `totalHtCents`, `approvedCents`) ; étape 7c : `orderBy` (date de commande au plus tard = besoin − délai − 14 jours, D7.5, `null` si inconnue, hors `fee`, hors lignes déjà commandées) et `orderOverdue` (dépassée à la date du serveur, jamais pour une ligne en attente), Prescrit par zone (somme des placements, « Non affecté » inclus), `specifiedCents`, `approvedCents` (snapshot des lignes ≥ `approved`), `oseCents`, TVA par taux, TTC — tout par `money.py` (`getProjectSummary`) ; étape 8 : bloc `budget` (`globalCents`, `contingencyBp`, `contingencyCents`, `specifiedCents`, `approvedCents`, `remainingCents`, `alert`, `byZone[]`, `byCategory[]` — chaque ligne : `budgetCents` ou `null`, `specifiedCents`, `approvedCents`, `remainingCents`, `alert`) | livrée (étape 7a, enrichie étape 8) |
| Sauvegarde | `POST /system/backup` → `{path, copiedTo, copyError, quickCheck, at}` : sauvegarde locale puis copie vérifiée vers `FFE_BACKUP_DIR` ; `copiedTo` null et `copyError` renseigné si le dossier Windows est absent (jamais une erreur HTTP) (`createBackup`) | livrée (étape 9) |
| Devis | `GET /projects/{id}/quotes` · `POST /projects/{id}/quotes` `{supplierId, reference, quotedOn?, validUntil?, currency?, fxRateMicro?, notes?, lines[]?}` (devise absente = celle du fournisseur ; taux absent = dernier taux du projet pour cette devise, 422 `fxRateMicro` sinon ; référence unique par fournisseur et projet → 422 `reference` ; ligne d'un autre projet ou terminale → 422 `lines.<i>.projectItemId`) · `GET/PATCH/DELETE /quotes/{id}` (DELETE 204, 409 si une ligne est retenue) · `POST /quotes/{id}/decline` · `POST /quotes/{id}/lines` · `PATCH/DELETE /quote-lines/{id}` (409 si retenue) · `POST /quote-lines/{id}/retain` → `ProjectItemRead` (ADR-0006 : copie fournisseur, prix, remise, devise, taux, délai, dates, référence ; événement `quote` ; passage en `quoted` ; 422 préconditions, 409 dès `ordered`, devis écarté ou ligne terminale) · `GET /project-items/{id}/quotes` → comparaison `[{quoteId, quoteLineId, supplierName, reference, currency, fxRateMicro, unitCostCents, discountBp, leadTimeWeeks, netUnitCents, netUnitEurCents, retained, declined}]` (`money.py`) · `POST /quotes/{id}/files` `{fileId, caption?}` · `DELETE /quotes/{id}/files/{fileId}` ; tout refusé (409) sur un projet clos (`listQuotes`, `createQuote`, `getQuote`, `updateQuote`, `deleteQuote`, `declineQuote`, `addQuoteLine`, `updateQuoteLine`, `deleteQuoteLine`, `retainQuoteLine`, `listProjectItemQuotes`, `attachQuoteFile`, `detachQuoteFile`) | livrée (étape 10a) |
| Achats | `/purchase-orders`, `/deliveries`, `/supplier-invoices` (forme à trancher aux étapes 10b–10c) | prévue (étapes 10b–10c) |
| Exports xlsx | `GET /projects/{id}/exports/schedule.xlsx?variant=&groupBy=` | prévue (étape F1) |
| Exports PDF | `GET /projects/{id}/exports/book.pdf` · `GET /purchase-orders/{id}/pdf` | prévue (étape F2) |
| Entreprises | `GET /companies/search?q=&country=FR` · `POST /companies/vat-check` `{vatNumber}` (proxy avec cache ; le front n'appelle jamais l'extérieur) | prévue (étape F3) |
| Imports | `POST /imports/products/preview` (multipart + `supplierId` + mapping) · `POST /imports/products/commit` | prévue (étape F4) |
| Captures | `GET /captures/preview?url=` · `POST /captures` (jeton local, CORS limité à l'extension) | prévue (étapes F5–F6) |

Toute route livrée hors de ce tableau, ou qui s'écarte d'une convention ci-dessus, se justifie dans `JOURNAL.md` et met ce fichier à jour dans le même commit.
