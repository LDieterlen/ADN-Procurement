# ADR-0021 — Options d'un article, codes sans trou avant le premier indice
Date : 2026-10-15
Statut : acceptée (questionnaire du 2026-10-15, recommandations retenues) ; remplace « un numéro n'est jamais réutilisé » d'ADR-0018 et « `item_code_sequence` jamais décrémentée » d'ADR-0012/0013 ; « premier indice » se lit « première diffusion » depuis ADR-0022

## Contexte
L'utilisatrice veut proposer des alternatives à un article (options), codées comme lui avec une lettre, et des codes sans trou (pas de 01 puis 03). ADR-0018 ne réutilisait jamais un numéro : chaque déplacement ou suppression laissait un trou.

## Décision
- **Option** = un article (`project_item`) rattaché à un article de base du même projet : `option_of_id` + `option_letter` (A, B, C…). La base garde son code ; l'option porte les codes de la base suivis de `-<lettre>` (`CHA-LUD-01-A`). Une option n'a pas d'implantation : elle reprend celles de la base (localisations, quantités). Ni un frais, ni une option ne peuvent avoir d'options ; une base avec des options ne devient pas une option. **Une option a le type de sa base** (2026-10-15) : refusé sinon à la création et au rattachement ; le type d'une option ne se change pas, celui de la base s'applique à ses options.
- Les options ne comptent dans aucun total (Prescrit, Devisé, Validé, parts par état, compilations) ; leur montant est donné à titre indicatif.
- **Ajouter une option** : nouvel article (`POST …/project-items` avec `optionOfId`) ou article existant du même type (`POST /project-items/{base}/options`) : il perd ses implantations.
- **Détacher une option** (`POST /project-items/{id}/detach`, 2026-10-15) : elle redevient un article indépendant avec une implantation non affectée de 1, à placer ; les lettres restantes sont comblées avant le premier indice.
- **Retenir une option** (`POST /project-items/{id}/retain`) : échange des rôles. L'option prend les implantations de la base (recodées à son type s'il diffère), la base devient une option avec la lettre libérée, les autres options suivent la nouvelle base ; journalisé sur les deux.
- **Codes sans trou** : un nouveau code prend le plus petit numéro libre de sa série (projet, localisation, type ; `FR` pour les frais), de même pour les lettres. **Avant le premier indice** du projet, un code libéré (suppression, déplacement, changement de type, article devenu option) est comblé : les codes suivants de la série descendent d'un cran (événement `placement` sur les articles touchés). **Après**, aucun code diffusé ne bouge : le trou sera comblé par le prochain article. Un article annulé garde son code.
- **Avant le premier indice**, tout article se supprime (quel que soit son statut ou son historique) ; après, seul un article « à chiffrer » sans historique. Une base avec des options ne se supprime pas.
- `item_code_sequence` n'est plus lue ni écrite ; la table reste (v1, migrations additives, ADR-0020).
- PDF : l'option suit sa base dans le listing et a sa propre fiche, avec son code à lettre ; elle se distingue d'un coup d'œil (2026-10-15) : même papier uni et une seule couleur, terre cuite (`#b0623e`), en fil conducteur : bande verticale au bord gauche de la page, étiquette « Option A » suivie de « Alternative à CHA-TAB-01 », cadre de localisation en terre cuite au lieu du brun foncé ; dans le listing et la liste des fiches, ligne légèrement teintée marquée d'un filet terre cuite à gauche, code FF&E en retrait, « OPTION A » devant la désignation.

## Alternatives écartées
- Tasser toujours : des codes déjà envoyés au client changeraient.
- Options avec leurs propres implantations : la quantité divergerait de l'article qu'elles remplacent.

## Conséquences
Migration `0003_item_option` (deux colonnes, index unique partiel), services `project_item` et `budget`, `exports/prescription.py`, page article (carte Options, « Retenir cette option »), liste des articles (options sous leur base).
