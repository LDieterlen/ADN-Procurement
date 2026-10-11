# ADR-0006 — Devis fournisseurs : un devis par fournisseur et projet, une ligne retenue par article
Date : 2026-10-11
Statut : à confirmer (étape 10a, défaut en mode enchaîné)

## Contexte
L'étape 10a compare des devis fournisseurs et en retient un par ligne de projet (ROADMAP). Le prix d'une ligne est une copie figée (ADR-0005) ; une ligne porte une seule devise et un seul taux de change ; un fournisseur devise dans sa devise. Il faut garder les devis non retenus (comparaison, historique) sans qu'ils comptent nulle part.

## Décision
- `quote` : un devis = **un fournisseur, un projet** (D10a.2, défaut), une référence fournisseur obligatoire, unique par `(project_id, supplier_id, reference)`, une devise et un `fx_rate_micro` figés à la réception (défaut : devise du fournisseur ; taux demandé si ≠ EUR, pré-rempli par le dernier taux du projet), `quoted_on`, `valid_until`, `declined_at` (écarté, jamais supprimé s'il a servi).
- `quote_line` : un prix par article du **même projet** (FK composite `(project_item_id, project_id)`), `unit_cost_cents`, `discount_bp`, `lead_time_weeks`, `description` du fournisseur ; une ligne de devis par article et par devis. **Au plus une ligne retenue par article** : `retained_at` + index unique partiel `(project_item_id) WHERE retained_at IS NOT NULL`.
- Retenir une ligne de devis = une transaction : dé-retient l'éventuelle ligne retenue d'un autre devis, pose `retained_at`, copie sur `project_item` fournisseur, prix, remise, devise, taux, délai (si renseigné), `quoted_on`, `quote_valid_until`, `quote_ref`, écrit un événement `quote` (ancien et nouveau prix, note « devis <réf> retenu ») **quel que soit le statut**, plus `price`/`fx` si la ligne est validée (ADR-0005), et passe la ligne en `quoted` si elle est en dessous (préconditions de `transitions.py` : 422 sinon). Refusé (409) dès `ordered` et sur une ligne terminale.
- `quote_file` : fichiers du devis (PDF), `UNIQUE (quote_id, file_id)`, CASCADE ; aucun `kind`.
- Aucun montant de devis n'est stocké ni sommé : la comparaison (`GET /project-items/{id}/quotes`) calcule net et net EUR par `money.py`.

## Alternatives écartées
- Devis multi-projets : un devis fournisseur réel vise un chantier ; la comparaison par article se fait dans un projet.
- Retenir au niveau du devis entier : un même fournisseur gagne rarement toutes les lignes ; la granularité est l'article.
- Supprimer les devis non retenus : perte de la comparaison et de l'historique de négociation.

## Conséquences
Migration 0008 (trois tables STRICT, index partiel), `services/quote.py` (toute écriture, journal garanti), type d'événement `quote` (sans CHECK, DATA_MODEL §4.13), routes `/projects/{id}/quotes`, `/quotes/{id}`, `/quote-lines/{id}`, `/project-items/{id}/quotes` (API.md), onglet « Devis » et section « Devis » de la fiche de ligne. Les bons de commande (10b) lisent la ligne, pas le devis.

## Repli
Un devis multi-projets ou une devise par ligne de devis = colonne additive (`quote_line.currency`), sans recréation ; retirer la contrainte « une ligne retenue » = supprimer l'index partiel.
