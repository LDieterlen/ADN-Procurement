# ADR-0013 — Recentrage : fiche d'article autonome, statut unique, localisations, budget par axes, modules d'achat retirés
Date : 2026-10-12
Statut : acceptée (douze décisions prises avec l'utilisateur le 2026-10-12, questionnaire dans le JOURNAL)

## Contexte
L'outil était devenu complet et complexe (devis, commandes, réceptions, factures, import de tarifs, machine à neuf statuts, quinze colonnes). L'utilisateur veut « commencer petit » sur un besoin limité, décrit par une liste de données (fiche de spec, listing FF&E, budget et synthèse) et par l'UX d'un outil antérieur : une page par élément, formulaires courts. Aucune donnée réelle n'existe : le schéma repart de zéro (ADR-0012).

## Décision
- **Retrait du code** des modules devis, bons de commande, réceptions, factures, import de tarifs, tableau de bord et mode avancé (tag git `v0-complet` pour les retrouver) ; dépendance `openpyxl` retirée.
- **Un seul statut** par article, libre, journalisé, note facultative : `to_quote` · `quoted` · `to_review` · `approved` · `deposit` · `purchased` · `cancelled` (À chiffrer · Devisé · À revoir · Validé · Acompte · Acheté · Annulé). Plus de `transitions.py`. `cancelled` sort de tous les totaux.
- **`location`** remplace `zone` : code, nom, **zone** (texte libre : Zones communes, Hébergement…), **niveau**, multiplicateur. Un article est implanté dans N localisations avec une quantité chacune. Code FF&E `<LOCALISATION>-<TYPE>-NN` (première implantation), `FR-NN` pour les frais.
- **Type de produit** = `category` à un seul niveau (19 types seedés, code = préfixe) ; **famille** et **usage** = listes fixes facultatives sur l'article.
- **L'article porte sa fiche** (nom, référence, fabricant, fournisseur, dimensions et finitions en texte libre, lien, commentaires, photo, dessin). Créer « depuis le catalogue » copie ces champs ; un article libre **rejoint le catalogue par défaut** (`addToCatalogue`, jumeau fabricant + référence réutilisé) sauf refus explicite.
- **Budget** : PU HT, devise, taux figé, remise, n° / indice / lien de devis sur l'article ; frais = lignes `kind='fee'` par fournisseur ; `budget_line` par périmètre `global` · `location` · `zone` · `family` · `supplier`. `GET /projects/{id}/summary` : Prescrit / Devisé / Validé, répartition par statut, compilation par localisation, zone, famille, type, fournisseur, filtres.
- **Champs supprimés** : unité, délai, dates, attente, remplacement, snapshots, TVA, GTIN, mode de taxe, SIREN/SIRET/TVA/adresses fournisseur, adresses et provision du projet. On ajoute au fur et à mesure.
- **Exports PDF seulement** : fiches de spec (`sheets.pdf`, indice A/B/C posé à l'émission) et listing (`list.pdf`) ; xlsx plus tard.
- Front : pages, pas de panneaux ; esthétique de l'outil antérieur (noir et blanc, cartes, pastilles).

## Alternatives écartées
- Garder les modules cachés : 40 % du code pour rien, statuts verrouillés, formulaires lourds.
- Deux statuts (prescription et achat) : « validé » est le même événement ; un seul champ suffit.
- Dimensions en millimètres typées : la fiche imprime un texte ; le texte libre couvre Ø et cm.

## Conséquences
Schéma 17 tables ; `money.py` réduit (remise → change → quantité, parts par implantation) ; services `location`, `project_item`, `budget.summary`, `project_file`, `exports/prescription.py` ; `ffe db seed --demo` ; docs DATA_MODEL, API, ARCHITECTURE, ROADMAP, GLOSSARY réécrits ; front réécrit en 12b/12c.

## Repli
Un module retiré se reprend depuis `v0-complet`, adapté au statut unique ; un champ supprimé revient par `ADD COLUMN` (après la v1) ou par régénération de `0001` (avant).
