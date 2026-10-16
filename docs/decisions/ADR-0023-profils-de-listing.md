# ADR-0023 — Profils de listing : colonnes choisies selon le destinataire
Date : 2026-10-16
Statut : acceptée (demande du 2026-10-16, profils et colonnes laissés au choix de Claude)

## Contexte
Le listing PDF imprimait toutes les colonnes et les liens en entier : trop large, et un client, un poseur ou un fournisseur n'ont pas besoin des mêmes informations.

## Décision
- **Catalogue fixe de colonnes** (`ffe/listing.py`, libellés dans `i18n/fr.py`) : photo, code, type, désignation, commentaires, lien, référence, fournisseur, contact, dimensions, finitions, famille, usage, délai, quantité, montant HT, état, indice. L'ordre d'impression est celui du catalogue.
- **Table `listing_profile`** (nom unique, colonnes en tableau JSON, ordre) ; profils de départ insérés par la migration `0007_listing_profile` puis modifiables comme les autres : « Complet » (toutes), « Client » (photo, code, type, désignation, dimensions, finitions, quantité, état, indice), « Installation » (photo, code, type, désignation, référence, fournisseur, dimensions, finitions, quantité, commentaires, indice), « Achats » (code, désignation, référence, fournisseur, contact, dimensions, finitions, quantité, délai, montant, lien, état), « Budget » (code, type, désignation, famille, fournisseur, quantité, montant, état).
- Création, modification (nom, colonnes), suppression physique (aucune référence) depuis Réglages ; choix du profil dans une fenêtre « Listing PDF » (profil, papier) ; `GET …/list.pdf?profile=<id>` (absent = toutes les colonnes).
- Le lien s'imprime « Lien » (cliquable), plus l'adresse entière.
- **Impression groupée** (2026-10-16, `ffe/listing.GROUPS`) : commentaires et lien sous la désignation, contact et délai sous le fournisseur, finitions sous les dimensions, usage sous la famille ; un listing complet tient en 12 colonnes dans la largeur d'une page paysage ; une ligne n'est jamais coupée entre deux pages. Options absentes du listing sauf case « Inclure les options » (`?options=true`).

## Alternatives écartées
- Profils écrits dans le code : pas modifiables par l'utilisatrice.
- Ordre des colonnes libre par profil : plus de réglages pour peu de gain ; l'ordre du catalogue suit la lecture d'un listing.

## Conséquences
Migration additive `0007_listing_profile` ; `services/listing_profile.py`, routes `/listing-profiles` ; export JSON : table semée, écrasée à l'import comme `choice`.
