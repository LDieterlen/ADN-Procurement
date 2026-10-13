# Décisions d'architecture (ADR)

Une ADR fige une décision structurante, son contexte et ce qu'on a écarté, pour ne jamais la rediscuter. Claude Code et l'utilisateur la citent (`ADR-0003 §Décision`) au lieu de la redemander.

## Règles

- Une ADR tient en **25 lignes non vides maximum** (titre, en-tête et sections compris). Si c'est trop court, la décision est trop grosse : la découper.
- Une ADR **acceptée ne se modifie plus** (hors coquille). Pour changer d'avis : écrire une nouvelle ADR, puis passer l'ancienne au statut « remplacée par ADR-NNNN ».
- Statuts : `acceptée` · `à confirmer` (acceptée par défaut, validation attendue à une étape nommée) · `remplacée par ADR-NNNN`.
- Nommage : `ADR-NNNN-sujet-en-kebab.md`, numéro séquentiel, jamais réutilisé.
- Un défaut appliqué sans réponse explicite de l'utilisateur est marqué « défaut » dans le texte.
- Toute question de conception (nouvelle dépendance, recréation de table, changement de convention) passe par une ADR avant le code.

## Gabarit

```markdown
# ADR-NNNN — Titre
Date : AAAA-MM-JJ
Statut : acceptée | à confirmer (étape N) | remplacée par ADR-NNNN
## Contexte
Pourquoi la question se pose, faits vérifiés (avec date), contraintes.
## Décision
Ce qui est retenu, en phrases affirmatives, avec noms exacts (tables, colonnes, fichiers, versions).
## Alternatives écartées
Une ligne par alternative : nom, raison du rejet.
## Conséquences
Ce que la décision impose au code, aux tests, aux docs, aux étapes suivantes.
## Repli
Comment revenir en arrière ou faire évoluer, et à quel coût.
```

## Index

| ADR | Titre | Statut | Date |
|---|---|---|---|
| [ADR-0001](ADR-0001-stack.md) | Stack : back Python, front TypeScript | acceptée | 2026-10-09 |
| [ADR-0002](ADR-0002-emplacement-et-sauvegardes.md) | Emplacement du dépôt, des données et sauvegardes | acceptée | 2026-10-09 |
| [ADR-0003](ADR-0003-argent-dates-identifiants.md) | Argent, dates, identifiants et intégrité | acceptée | 2026-10-09 |
| [ADR-0004](ADR-0004-langues-et-conventions.md) | Langues, conventions et mode de collaboration | acceptée | 2026-10-09 |
| [ADR-0005](ADR-0005-lignes-placements-prix.md) | Lignes, placements, prix figés et statuts | à confirmer (étape 2) | 2026-10-09 |
| [ADR-0006](ADR-0006-devis-fournisseurs.md) | Devis fournisseurs : un devis par fournisseur et projet, une ligne retenue par article | à confirmer (étape 10a) | 2026-10-11 |
| [ADR-0007](ADR-0007-bons-de-commande.md) | Bons de commande : mono-projet, mono-fournisseur, numérotés par année, émission = lignes commandées | à confirmer (étape 10b) | 2026-10-11 |
| [ADR-0008](ADR-0008-receptions-et-factures.md) | Réceptions et factures fournisseur : par bon de commande, réception partielle, factures et paiements en une table | à confirmer (étape 10c) | 2026-10-11 |
| [ADR-0009](ADR-0009-exports-xlsx.md) | Exports xlsx : openpyxl, valeurs seulement, chaque export émis conservé | à confirmer (étape F1) | 2026-10-11 |
| [ADR-0010](ADR-0010-exports-pdf.md) | Exports PDF : WeasyPrint + Jinja2, book client et bon de commande, note de licence des images | à confirmer (étape F2) | 2026-10-11 |
| [ADR-0011](ADR-0011-import-tarifs.md) | Import de tarifs fournisseur (xlsx/CSV) : mapping par fournisseur, rapprochement en trois clés, observations de prix | à confirmer (étape F4) | 2026-10-11 |
| [ADR-0012](ADR-0012-prescription-codes-indice.md) | Prescription simple : codes zone-typologie, localisation, indice de diffusion, schéma repris de zéro jusqu'à la v1 | partiellement remplacée par ADR-0013 (codes, localisation) | 2026-10-12 |
| [ADR-0013](ADR-0013-recentrage-prescription-budget.md) | Recentrage : fiche d'article autonome, statut unique, localisations, budget par axes, modules d'achat retirés | acceptée | 2026-10-12 |
| [ADR-0016](ADR-0016-sans-catalogue.md) | Pas de catalogue : tables `product` / `product_file` retirées, l'article porte toute sa fiche | acceptée | 2026-10-13 |
| [ADR-0014](ADR-0014-coller-une-adresse.md) | « Coller une adresse » : lecture générique d'une page produit, côté serveur, à la demande | acceptée | 2026-10-12 |
| [ADR-0015](ADR-0015-annuaire-professionnels.md) | Annuaire : `professional` (prestation, savoir-faire, deux contacts) détaché des produits, contacts enrichis du fournisseur, import CSV | acceptée | 2026-10-12 |
