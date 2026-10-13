# ADR-0012 — Prescription simple : codes zone-typologie, localisation, indice de diffusion, schéma repris de zéro jusqu'à la v1
Date : 2026-10-12
Statut : acceptée (décisions prises avec l'utilisateur le 2026-10-12). Complément du 2026-10-13 : la base de dev se recrée seule au démarrage quand le schéma a changé (`db/reset.py`, cycle étape 8), `ffe db reset-dev` à la main ; jamais sur la base réelle.

## Contexte
L'écran projet était devenu trop complexe pour l'usage premier : prescrire. L'utilisateur a montré ses fiches d'un outil antérieur (liste Typologie · Code FF&E · Désignation · Localisation · Indice, puis une fiche par article avec photo, dessin, fabricant, référence, contact fournisseur, diffusion, validation). Aucune donnée réelle n'existe encore ; les treize migrations incrémentales ne protégeaient rien.

## Décision
- **Code article** `<ZONE>-<TYPO>-NN` : code de la zone du premier placement (vide → `<TYPO>-NN`), code de la catégorie de niveau 1, numéro à deux chiffres minimum servi par `item_code_sequence (project_id, zone_code, prefix, next_value)`, jamais décrémenté. Remplace `code_sequence` et `<CAT>-NNN`. Éditable en brouillon, immuable ensuite ; `.R1` au remplacement inchangé.
- **Localisation** `project_item.location` (`floor`, `wall`, `ceiling`, `door`, `other`), facultative.
- **Indice** (remplacé le 2026-10-13 : la lettre est déclarée par l'utilisateur sur le projet, `services/project.next_indice`, et plus jamais posée par un export, voir JOURNAL) : chaque émission du PDF de prescriptions porte une lettre (A, B, C… = rang de l'émission, `project_file.indice`) ; chaque ligne modifiée depuis l'émission précédente (`updated_at` postérieur, ou jamais émise) prend cette lettre dans `project_item.indice`, sans toucher `updated_at`. Vide avant la première diffusion. Tout changement (statut, placement, prix) compte : c'est la trace d'évolution voulue.
- **Budget global à la création** : `ProjectCreate.global_budget_cents` crée la ligne de budget globale dans la même transaction.
- **PDF de prescriptions** (`GET /projects/{id}/exports/book.pdf`, `kind = book_pdf`) : couverture, liste par zone, une fiche par article (photo, dessin `kind = 'drawing'`, fabricant, nom produit, référence, finition, dimensions, quantité, commentaires, lien, fournisseur et son représentant / téléphone / email, diffusion, validation). Jamais de prix. Nom `<code>-prescriptions-<indice>-<date>.pdf`.
- **Schéma repris de zéro jusqu'à la v1** : une seule migration `0001_initial.py`, régénérée (`alembic revision --autogenerate`, relue, index d'expression et ligne `setting` ajoutés à la main) à chaque changement de modèle ; base de dev recréée. L'historique devient immuable **le jour où l'utilisateur déclare la v1**. Remplace la règle « immuable dès l'étape 6a ».
- Front (11b/c) : mode avancé local (`localStorage`) masquant devis, commandes, factures, import de tarifs et tableau de bord ; création de client, fournisseur, fabricant et produit depuis le projet.

## Alternatives écartées
- Élargir le CHECK de `code_sequence` par recréation batch : une table dédiée est additive et plus lisible.
- Indice par comparaison de contenu : complexe ; `updated_at` suffit et trace aussi les changements de statut.
- Garder treize migrations sans donnée réelle : du poids sans protection.

## Conséquences
Modèles `item_code_sequence`, `project_item.location/indice`, `project_file.indice` ; `services/project_item.next_item_code`, `services/project_file.stamp_indices`, `services/project.create_project` ; gabarit `book.html` ; CLAUDE.md, ARCHITECTURE §5 et DATA_MODEL corrigés ; tests de codes réécrits.

## Repli
Autre format de code = constante de `next_item_code` ; déclarer la v1 = figer `0001_initial.py` et reprendre les migrations incrémentales.
