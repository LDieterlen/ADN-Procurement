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
| `GET /x` | Liste ; exclut les archivés sauf `?includeArchived=true` | 200, tableau (ou `{items, total}` sur les listes paginées) |
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

- Pagination **seulement sur le référentiel** (`/suppliers`, `/professionals`) : `?q=&limit=50&offset=0`, `limit` ≤ 200, réponse `{ "items": [...], "total": n }`. Les autres listes (clients, types, projets, localisations, articles d'un projet, budgets) renvoient un tableau complet : le volume visé ne justifie pas plus.
- Filtres : paramètres de requête validés par Pydantic (`?locationId=3&status=approved`). `q` : recherche par mot, insensible à la casse et aux accents, sur nom, représentant et références.

### En-têtes

- Requête : `Content-Type: application/json` obligatoire sur `POST`/`PATCH`/`PUT`, sauf `multipart/form-data` pour `POST /files`.
- Réponse : `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`. Pas d'`ETag` ni d'`If-Match` en v1 (mono-utilisateur), sauf `GET /files/{id}/content` : `Cache-Control: private, no-cache` et `ETag` = sha256, 304 sur `If-None-Match` (un identifiant peut désigner d'autres octets après une base de dev recréée).
- Fichiers : limite 20 Mo (défaut, étape 6b), dédoublonnage par `sha256` ; `GET /files/{id}/content` renvoie le binaire avec son `Content-Type` d'origine.

## Routes

| Ressource | Routes (sous `/api/v1`) | Statut |
|---|---|---|
| Système | `GET /health` → `{ok, dbPath, isDevDb, schemaRevision, lastBackupAt, backupDir, backupDirOk, lastQuickCheck, logPath}` (`getHealth`) · `POST /system/backup` → `{path, copiedTo, copyError, quickCheck, at}` (`createBackup`) | livrée (étapes 1, 9) |
| Réglages | `GET /settings` · `PATCH /settings` (`projectCodePrefix` majuscules `A-Z0-9-` ≤ 10, `agencyName`, `agencyAddress`, `agencyEmail`, `agencyPhone` ; `baseCurrency`, `seedCategoryVersion` en lecture seule ; textes vides → `null`) · `POST /settings/extension-token` → jeton régénéré dans `extensionToken` (`getSettings`, `updateSettings`, `generateExtensionToken`) | livrée (étape 9, allégée étape 12, jeton F6) |
| Clients | `GET /clients?q=&includeArchived=` · `POST /clients?force=` · `GET/PATCH /clients/{id}` · `POST …/archive` · `unarchive` (`listClients`, `createClient`, `getClient`, `updateClient`, `archiveClient`, `unarchiveClient`) | livrée (étape 4) |
| Fournisseurs | `GET /suppliers?q=&specialty=&includeArchived=&limit=50&offset=0` → `{items, total}` (`q` sur nom, savoir-faire et représentant ; `specialty` = égalité normalisée) · `GET /suppliers/specialties` → `string[]` (savoir-faire distincts des fournisseurs actifs, pour le menu de filtre) · `POST /suppliers?force=` (`name`, `specialty`, `contactName`, `email`, `phone`, `mobile`, `contact2Name`, `contact2Phone`, `contact2Email`, `website`, `currency`, `notes`) · `GET/PATCH /suppliers/{id}` · `POST …/archive` · `unarchive` (`listSuppliers` …) | livrée (étape 6a, allégée étape 12) |
| Professionnels | `GET /professionals?q=&kind=&specialty=&includeArchived=&limit=&offset=` → `{items, total}` (recherche sur nom, savoir-faire, contact ; filtres prestation et savoir-faire) · `GET /professionals/specialties` → `string[]` · `POST /professionals?force=` (`name`, `kind` = `manufacturer` · `distributor` · `publisher` · `artisan`, `specialty`, `contactName`, `phone`, `mobile`, `email`, `contact2Name`, `contact2Phone`, `contact2Email`, `website`, `notes`) · `GET/PATCH /professionals/{id}` · `POST …/archive` · `unarchive` (`listProfessionals` …) | livrée (étape 6a comme `/manufacturers`, annuaire ADR-0015 le 2026-10-12) |
| Types de produit | `GET /categories?includeArchived=` (par `sortOrder`) · `POST /categories` `{code (2-4 majuscules, unique), name (unique), sortOrder}` · `GET /categories/{id}` · `PATCH /categories/{id}` (`name`, `sortOrder` ; le code est immuable) · `POST …/archive` · `unarchive` (`listCategories` …) | livrée (étape 6a, un seul niveau étape 12) |
| Listes | `GET /choices?list=family\|usage\|prestation&includeArchived=` → `ChoiceRead[]` (ordre `sortOrder`) · `POST /choices` `{list, name, sortOrder?}` (code généré du nom ; 422 `name` si déjà présent) · `PATCH /choices/{id}` `{name?, sortOrder?}` (code immuable) · `POST …/archive` · `unarchive` ; les articles, budgets par famille et professionnels n'acceptent qu'un code actif (422) (`listChoices`, `createChoice`, `updateChoice`, `archiveChoice`, `unarchiveChoice`) | livrée (2026-10-14) |
| Fichiers | `POST /files` (multipart `file` ; 201 nouveau, 200 si le sha256 existe ; 422 MIME refusé, 413 au-delà de 20 Mo) · `GET /files/{id}/content` (`uploadFile`, `getFileContent`) ; les jointures sont celles des articles (`/project-items/{id}/files`) | livrée (étape 6b, allégée ADR-0016) |
| Projets | `GET /projects?status=&clientId=` → `ProjectListRead[]` (projet + `budgetCents`, `specifiedCents`, `itemCount` calculés, tri `code` décroissant) · `POST /projects` `{name, clientId, code?, siteAddress?, dueOn?, notes?, globalBudgetCents?}` (code absent → `<préfixe>AAAA-NNN` ; budget → ligne `global`) · `GET/PATCH /projects/{id}` (409 si clos) · `POST /projects/{id}/status` `{status}` · `POST /projects/{id}/indice` → lettre suivante déclarée (`indice`, `indiceChangedAt`), articles modifiés depuis la déclaration précédente marqués (événement `indice`) ; 409 si clos · `DELETE /projects/{id}/indice` → la dernière déclaration est retirée, projet et articles reviennent à la lettre d'avant ; 409 sans déclaration (`revertProjectIndice`) (`listProjects`, `createProject`, `getProject`, `updateProject`, `changeProjectStatus`, `nextProjectIndice`) | livrée (étape 6c, revue étape 12) |
| Localisations | `GET /projects/{id}/locations?includeArchived=` · `POST /projects/{id}/locations` `{code, name, zone?, level?, multiplier, sortOrder?}` (code unique par projet, insensible à la casse) · `POST /projects/{id}/locations/reorder` `{locationIds}` · `GET/PATCH /locations/{id}` · `DELETE /locations/{id}` → 204 (vide ; implantations et budgets en RESTRICT → 409) · `POST /locations/{id}/archive` · `unarchive` ; refusé (409) sur un projet clos (`listLocations`, `createLocation`, `reorderLocations`, `getLocation`, `updateLocation`, `deleteLocation`, `archiveLocation`, `unarchiveLocation`) | livrée (étape 12, remplace les zones) |
| Articles | `GET /projects/{id}/project-items?locationId=&status=&categoryId=&supplierId=&kind=&q=` · `POST /projects/{id}/project-items` (`kind` `product` \| `fee` ; `categoryId` + `productName` (« Nom ») requis pour un article, `name` (« Désignation ») absent → le nom, `productName` absent → `name` (422 `productName` sans aucun des deux), toute la fiche se saisit ici (ADR-0016) ; `fxRateMicro` requis hors EUR sauf taux déjà connu dans le projet ; `placements[{locationId?, qtyMilli, sortOrder}]` absent → une implantation non affectée ; `fee` : `supplierId` requis, ni type ni implantation ; chaque implantation reçoit son code `<LOC>-<TYPE>-NN` ; `itemCode` réservé aux frais, absent → `FR-NN` ; réponse : `placements[].code`, `itemCode` = libellé des codes, ADR-0018) · `GET/PATCH /project-items/{id}` (fiche, famille, usage, prix, devise, taux, remise, devis ; `categoryId` recode toutes les implantations ; `itemCode` des frais seulement (422 sur un produit) ; jamais `status`) · `DELETE /project-items/{id}` → 204 (`to_quote` sans autre événement que `created`) (`listProjectItems`, `createProjectItem`, `getProjectItem`, `updateProjectItem`, `deleteProjectItem`) | livrée (étape 7a, réécrite étape 12) |
| Implantations | `POST /project-items/{id}/placements` `{locationId?, qtyMilli, sortOrder}` (localisation du projet et active, une par localisation ; 409 sur un `fee`) · `PATCH /placements/{id}` (changer `locationId` donne un nouveau code) · `DELETE /placements/{id}` (409 sur la dernière) ; réponses = l'article complet (`addPlacement`, `updatePlacement`, `deletePlacement`) | livrée (étape 7a) |
| Fichiers d'article | `POST /project-items/{id}/files` `{fileId, kind: image \| drawing \| other, isPrimary, caption?, sortOrder}` · `PATCH …/files/{fileId}` · `DELETE …/files/{fileId}` (`attachProjectItemFile`, `updateProjectItemFile`, `detachProjectItemFile`) | livrée (étape 7a) |
| Statut et journal | `POST /project-items/{id}/status` `{status, note?}` (libre entre les sept statuts, 409 si identique, note facultative) · `GET /project-items/{id}/events` (`changeProjectItemStatus`, `listProjectItemEvents`) | livrée (étape 7a, libre étape 12) |
| Budgets | `GET /projects/{id}/budget-lines` · `PUT /projects/{id}/budget-lines` `{lines: [{scope: global \| location \| zone \| family \| supplier, locationId?, zone?, family?, supplierId?, amountCents, notes?}]}` : remplacement en bloc ; la référence doit correspondre au périmètre (422 `lines.<i>.scope`), localisation du projet (422 `lines.<i>.locationId`), famille connue, fournisseur existant ; même périmètre deux fois → 409 ; 409 sur un projet clos (`listBudgetLines`, `putBudgetLines`) | livrée (étape 8, périmètres étape 12) |
| Synthèse | `GET /projects/{id}/summary?locationId=&zone=&family=&categoryId=&supplierId=` → `{lines[{projectItemId, itemCode, status, kind, counted, totalQtyMilli, netUnitCents, netUnitEurCents, totalHtCents, placements[{placementId, totalHtCents}]}], budgetCents, specifiedCents, quotedCents, approvedCents, remainingCents, alert, byStatus[{status, count, amountCents, shareBp}], byLocation[], byZone[], byFamily[], byType[], bySupplier[]}` — chaque ligne de compilation : `{key, label, budgetCents, specifiedCents, quotedCents, approvedCents, remainingCents, alert}` ; tout par `money.py` (`getProjectSummary`) | livrée (étape 7a, réécrite étape 12) |
| Exports PDF | `GET /projects/{id}/exports/sheets.pdf` → fiches de prescription (couverture, liste par localisation, une fiche par article et par implantation : photo, dessin, nom, référence, fournisseur, dimensions, finitions, quantité, commentaires, lien, représentant, téléphone, email, diffusion, validation ; jamais de prix ; frais et annulés exclus) ; porte l'indice déclaré du projet sans rien marquer (2026-10-13), nom `<code>-fiches[-<indice>]-<date>.pdf` · `GET /projects/{id}/exports/list.pdf` → listing paysage (photo, code, type, désignation, référence, fournisseur et contact, dimensions · finitions, famille · usage, quantité, montant HT, état, indice) · `GET /projects/{id}/exports` → `[{id, fileId, kind, issuedAt, indice, originalName, sizeBytes}]` (`exportSheets`, `exportList`, `listProjectExports`) | livrée (étape F2, revue étape 12) |
| Exports xlsx | listing et budget en xlsx | parquée (ADR-0013 : PDF seulement pour l'instant) |
| Entreprises | `GET /companies/search?q=&country=FR` · `POST /companies/vat-check` | prévue (étape F3) |
| Coller une adresse | `GET /captures/preview?url=` → `{url, name, brand, reference, imageUrl, priceCents, currency, description, source: json-ld \| opengraph \| title, imageUrls (toutes les photos, 12 au plus), typeCode, dimensions, leadTime, finish}` (les quatre derniers devinés : mots-clés du nom et du fil d'Ariane, motifs « H × L × P cm », « sous 3 semaines » ; aucune règle par site) (lecture d'une page par le serveur, 10 s, 3 Mo, http/https ; 422 `url` : adresse invalide, page injoignable ou en erreur, pas une page web, aucune fiche lisible ; rien n'est enregistré) · `POST /captures/image` `{url}` → 201 `FileRead` (image téléchargée par le serveur, reconnue par ses octets, conservée comme un envoi avec `sourceUrl`) (`previewCapture`, `captureImage`) | livrée (étape F5, ADR-0014) |
| Boîte de réception (extension) | `POST /captures` (multipart `url`, `html` en pièce jointe (un champ de formulaire est plafonné à 1 Mo par Starlette ; la page ≤ 5 Mo), `image?` ; en-tête `X-FFE-Token` sinon 401 `unauthorized` ; extraction générique de la page envoyée, image téléchargée par le serveur si possible) → 201 `CaptureRead {id, preview (+ imageUrls), images[], createdAt}` (toutes les photos de la page, 12 au plus) · `POST /captures/{id}/image` (multipart `image` + `url`, jeton ; ajoute la photo à la capture) · `GET /captures` → `CaptureRead[]` (plus récentes d'abord) · `DELETE /captures/{id}` → 204 (image retirée si orpheline) ; CORS : origines `chrome-extension://` seulement (`createCapture`, `attachCaptureImage`, `listCaptures`, `deleteCapture`) | livrée (étape F6, ADR-0017) |
| Extension navigateur | `POST /captures` depuis l'extension, jeton local | prévue (étape F6) |

Toute route livrée hors de ce tableau, ou qui s'écarte d'une convention ci-dessus, se justifie dans `JOURNAL.md` et met ce fichier à jour dans le même commit.
