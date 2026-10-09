# ADR-0003 — Argent, dates, identifiants et intégrité
Date : 2026-10-09
Statut : acceptée

## Contexte
Montants, taux, quantités et dates doivent être exacts au centime, portables, et garantis par des contraintes dans la base plutôt que par du code. SQLite ≥ 3.37 offre les tables STRICT ; flottants et vues calculées sont des sources d'écarts et compliquent les recréations de table d'Alembic.

## Décision
- Argent : `*_cents INTEGER` HT + `currency TEXT` (ISO 4217) ; taux en points de base `*_bp INTEGER` (10 000 = 100 %) ; quantités `qty_milli INTEGER` (× 1 000, m² et ml possibles) ; change `fx_rate_micro INTEGER` (1 unité de devise = `fx_rate_micro` / 1 000 000 EUR ; 1 000 000 pour l'EUR), figé par ligne.
- Tous les calculs dans `api/src/ffe/money.py` (entiers, arrondi au centime). Rien de calculé n'est stocké, zéro vue SQL, le front n'additionne jamais.
- Dates : `*_at` ISO-8601 UTC (`Z`), `*_on` au format `YYYY-MM-DD`, toujours posées par le service ; aucun `DEFAULT` SQL de date.
- Identifiants : `id INTEGER PRIMARY KEY` ; tables au singulier, snake_case ; contraintes nommées par `naming_convention` SQLAlchemy (requis par le mode batch d'Alembic).
- Intégrité dans la base : tables STRICT (le `CHECK typeof(col) = 'integer'` n'est que le repli si une table ne pouvait être STRICT) ; `>= 0`, statuts énumérés, formats SIREN/SIRET (GLOB) ; UNIQUE métier sans colonne nullable nue (`COALESCE(col, 0)` ou index partiel `WHERE`) ; FK `ON DELETE RESTRICT` par défaut, CASCADE seulement pour les enfants stricts (placements, événements, jointures de fichiers).
- Archivage `archived_at` sur les référentiels ; suppression physique bornée : brouillon sans événement, zone vide, placement, ligne de budget.

## Alternatives écartées
- `DECIMAL` ou `REAL` : SQLite ne type pas `DECIMAL`, les flottants arrondissent mal.
- UUID : plus lourds, illisibles dans l'UI, inutiles en mono-utilisateur.
- Suppression en cascade générale : perte silencieuse d'historique. Vues SQL : doublon de `money.py` et piège lors des recréations de table.

## Conséquences
Tests d'intégrité à l'étape 3 (pragmas actifs, CHECK, UNIQUE partiels, FK) ; `money.py` testé de façon exhaustive à l'étape 7a ; les synthèses sont des fonctions de service testées sur un jeu de référence. Colonnes de devise : `project_item.currency` + `fx_rate_micro`, `product.list_price_currency`, `supplier.currency`, `setting.base_currency` = `'EUR'`. Budgets et totaux en EUR net HT.

## Repli
Portabilité Postgres conservée (BIGINT, pas de type exotique, GLOB isolé). Un changement d'unité (millièmes insuffisants, nouvelle devise de base) = colonne additive + nouvelle ADR, jamais une réinterprétation des entiers existants.
