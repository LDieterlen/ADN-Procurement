# ADR-0009 — Exports xlsx : openpyxl, valeurs seulement, chaque export émis conservé
Date : 2026-10-11
Statut : à confirmer (étape F1, défaut en mode enchaîné)

## Contexte
L'étape F1 sort le schedule (interne ou client) et le récapitulatif budget en Excel, avec des totaux identiques à l'écran. Tous les montants sont calculés par `money.py` et servis par `GET /projects/{id}/summary` ; le front n'additionne jamais. Un export est un document émis : il doit pouvoir être retrouvé tel qu'envoyé.

## Décision
- Bibliothèque : **openpyxl 3.1** (ajout à ADR-0001, `api/`), écriture seule, aucune formule : chaque cellule reçoit une **valeur** calculée par `money.py` (centimes → nombre à deux décimales, format `# ##0,00`), jamais une formule Excel qui recalculerait (ROADMAP « Risques »).
- Un classeur par export, module `api/src/ffe/exports/schedule_xlsx.py` : feuille « Schedule », **une ligne par placement** (DF1.1, défaut), groupée par zone dans l'ordre des zones, lignes annulées et remplacées exclues ; feuille « Budget » (variante interne seulement) reprenant le bloc `budget` de la synthèse par zone puis par catégorie.
- Deux variantes (DF1.2) : `internal` = toutes les colonnes (zone, ×, code, désignation, type, finition, fournisseur, qté/zone, qté totale, PU net devise, devise, PU net €, total HT €, statut, délai, commander avant le) ; `client` = sans prix d'achat, fournisseur, frais (`kind = 'fee'`), ni totaux, avec `client_description` à la place des notes internes.
- Chaque export émis est **conservé** : octets stockés par `services/file.store_bytes` (sha256, `files/`), ligne `project_file (project_id, file_id, kind, variant, issued_at)` ; `GET /projects/{id}/exports` les liste, `GET /files/{id}/content` les redonne. Un export identique (même sha256) ne duplique pas le fichier, seulement la ligne d'émission.

## Alternatives écartées
- xlsxwriter : écriture seule aussi, mais openpyxl relit les classeurs (tests, import F4).
- Formules Excel pour les totaux : recalcul côté Excel, risque d'écart avec l'écran.
- Ne pas conserver les exports : impossible de prouver ce qui a été envoyé au client.

## Conséquences
Migration 0011 (`project_file`), `services/project_file.py`, `exports/schedule_xlsx.py`, route `GET /projects/{id}/exports/schedule.xlsx?variant=`, liens dans l'onglet Lignes, test de relecture openpyxl (totaux = synthèse). F2 (PDF) réutilise `project_file` avec `kind = 'book_pdf'`.

## Repli
Une feuille par zone (DF1.1 alternative) = option de requête additive ; colonnes = constante du module.
