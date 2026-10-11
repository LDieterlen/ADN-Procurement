# ADR-0011 — Import de tarifs fournisseur (xlsx/CSV) : mapping par fournisseur, rapprochement en trois clés, observations de prix
Date : 2026-10-11
Statut : à confirmer (étape F4, défaut en mode enchaîné)

## Contexte
L'étape F4 charge les tarifs **fournis par le fournisseur** (seule voie légale de « copie de catalogue », plan du 2026-10-09). Les fichiers sont hétérogènes (colonnes, séparateurs, prix TTC non signalés). Le produit porte déjà `list_price_*`, `manufacturer_ref`, `gtin`, `supplier_ref`, `discontinued_on`, `source_kind`.

## Décision
- Formats : **xlsx** (openpyxl, première feuille, première ligne = en-têtes) et **CSV** (séparateur détecté, UTF-8 avec ou sans BOM, repli latin-1). Le fichier est conservé (`store_bytes`) et référencé par le lot.
- **Mapping par fournisseur**, enregistré dans `supplier.import_mapping` (JSON, ADD COLUMN) et réutilisé au prochain import : colonne du fichier → champ (`name`, `supplierRef`, `manufacturerRef`, `gtin`, `listPrice`, `leadTimeWeeks`, `finish`, `manufacturerName`) ; options `taxMode` (**obligatoire**, `ht`/`ttc`), `vatBp` (requis en TTC), `defaultCategoryId` (produits créés), `currency` (défaut : devise du fournisseur).
- Rapprochement (DF4.1, défaut) : `gtin`, puis `(manufacturer_id, manufacturer_ref)` normalisé, puis `supplier_ref` chez ce fournisseur ; le fabricant vient de la colonne `manufacturerName` (rapproché par nom normalisé, créé au besoin). Deux temps : **preview** (plan ligne par ligne : créer / mettre à jour / inchangé / ignorer avec motif, jamais d'écriture) puis **commit** (même fichier, même mapping).
- Effets du commit : produit créé (`source_kind = 'import'`) ou mis à jour (`list_price_cents`, devise, mode, TVA, `list_price_on` = date du jour, délai, finition si mappés) ; une `price_observation` par ligne avec prix ; `list_price_*` = dernière observation ; option `markMissingDiscontinued` : les produits de ce fournisseur avec `supplier_ref` absents du fichier reçoivent `discontinued_on` (défaut : non). Un lot `import_batch` conserve fichier, mapping et comptes.
- Prix : texte → centimes par `decimal.Decimal` (virgule ou point, espaces, symbole), arrondi au centime, demi-supérieur ; aucun flottant. PDF tarifaires hors périmètre (DF4.2).

## Alternatives écartées
- Pandas : dépendance lourde pour deux formats simples.
- Import sans preview : une colonne mal mappée écrase des centaines de prix.
- Rapprochement par nom : trop ambigu ; le nom ne sert qu'à créer.

## Conséquences
Migration 0013 (`import_batch`, `price_observation`, `supplier.import_mapping`), `imports/price_import.py` (lecture, mapping, plan), `services/product_import.py`, routes `POST /imports/products/preview|commit` (multipart), `GET /imports/products/batches`, `GET /imports/products/mapping`, page « Import tarifs ». Tests : xlsx et CSV réels générés, plan, commit, second import avec le mapping enregistré, disparus.

## Repli
Clé de rapprochement supplémentaire = ajout dans `MATCH_ORDER` ; champ supplémentaire = ajout dans `FIELDS`.
