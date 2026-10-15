# ADR-0018 — Un code FF&E par implantation
Date : 2026-10-14
Statut : acceptée (demande de l'utilisateur du 2026-10-14) ; remplace la règle « un article garde un seul `item_code` » d'ADR-0013 ; partiellement remplacée par ADR-0021 (« un numéro n'est jamais réutilisé » → plus petit numéro libre, tassement avant le premier indice)

## Contexte
Le code `<LOC>-<TYPE>-NN` était porté par l'article et pris à sa première implantation. Deux défauts relevés par l'utilisateur : changer la localisation ne changeait pas le code, et un article implanté dans plusieurs pièces n'avait qu'un code. En FF&E, un code désigne un article **dans une pièce** : c'est ce que lisent le listing et les fiches (une ligne et une fiche par implantation).

## Décision
- Le code est porté par l'**implantation** : `project_item_placement.code`, `<LOC>-<TYPE>-NN` (`<TYPE>-NN` non affecté), `UNIQUE (project_id, code)`. Un article a autant de codes que d'implantations.
- Les **frais** (`kind='fee'`, sans implantation) gardent leur code sur l'article : `project_item.item_code` = `FR-NN`, NULL pour un produit.
- Nouvelle implantation, changement de localisation d'une implantation : nouveau numéro dans la localisation d'arrivée. Changement de type : toutes les implantations sont recodées. Toujours, quel que soit le statut ; `item_code_sequence` jamais décrémentée, un numéro n'est jamais réutilisé ; l'événement `placement` garde les codes avant / après.
- DTO : `PlacementRead.code` ; `ProjectItemRead.itemCode` = libellé des codes (frais : `FR-NN` ; produit : codes des implantations séparés par « · »).
- Plus de saisie manuelle du code d'un produit (celle des frais reste).

## Alternatives écartées
- Garder un code d'article et afficher la pièce à côté : ne répond pas au besoin (un code = une pièce).
- Figer le code après « Devisé » : l'utilisateur veut que le code suive la pièce ; l'indice signale les fiches modifiées.

## Conséquences
Migration 0001 régénérée ; `services/project_item.py` (attribution par implantation), `exports/prescription.py` (code de la ligne = code de l'implantation), page article (colonne Code dans Implantation), liste des articles (code de l'implantation dans chaque groupe de localisation).
