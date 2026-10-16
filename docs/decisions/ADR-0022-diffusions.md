# ADR-0022 — Diffusions choisies à la génération des fiches, indice par code
Date : 2026-10-15
Statut : acceptée (questionnaire du 2026-10-15) ; remplace la règle « indice déclaré sur le projet » du 2026-10-13 ; dans ADR-0021, « premier indice » devient « première diffusion »

## Contexte
L'indice se déclarait à la main (« Nouvel indice ») et marquait tout article modifié. L'utilisatrice veut le fonctionnement d'une agence : on diffuse officiellement des fiches, et l'indice d'une fiche ne bouge que si le produit présenté change.

## Décision
- **Diffusion choisie à la génération** : fenêtre « Fiches PDF » (case « Diffusion officielle », papier couleur / blanc / les deux, case « Inclure les options ») ; sans diffusion, document de travail qui ne change rien. Indice affiché en direct (pages, documents de travail) : celui que la prochaine diffusion donnera, signalé comme non officiel tant qu'elle n'a pas eu lieu (2026-10-16). Table `project_diffusion` (numéro, date, annulation).
- **Indice par code** (`project_item_placement.indice`, `diffused_item_id`) : chaque code commence sans indice (« - »), y compris un code ajouté après la 1ère diffusion (révision du 2026-10-16) ; un code dont le produit a changé (option retenue : même code, autre article) passe à la lettre suivante (- → A → B…) ; l'évolution d'une diffusion à l'autre est marquée à part sur les fiches : « Nouveau » (bleu ardoise) pour un code jamais diffusé, « Modifié » (vert sauge) pour un produit remplacé, option en gris, par un bandeau en bord de page et une pastille (couleurs ternes accordées au papier, ni rouge ni orange ; encart de localisation inchangé) ; un changement de caractéristiques (nom, prix…) ne change pas l'indice.
- **Avant la 1ère diffusion** tout est libre (ADR-0021 : suppression, codes tassés). **Après** : codes figés ; un article déjà diffusé (`first_diffusion_id`) ne se supprime plus (on l'annule), une implantation diffusée ne se déplace ni ne se retire, un article diffusé ne change plus de type et ne devient pas une option, une localisation portant des codes diffusés garde son code ; ce qui n'a jamais été diffusé reste libre.
- **Options** hors des fiches, sauf case « Inclure les options » (sans indice).
- **La dernière diffusion s'annule** (Historique) : chaque code et chaque article reviennent à leur état d'avant (journal `indice` noté `diffusion:<id>`), la diffusion est marquée annulée, ses PDF restent.
- Ancien régime (`project.indice`, `project_indice`, `project_item.indice`, `project_file.indice`) gardé mais plus lu ni écrit (v1 additive, ADR-0020) ; aucune base n'avait de diffusion à reprendre.

## Alternatives écartées
- Lettre de diffusion commune (un code modifié prend la lettre de la diffusion) : l'utilisatrice préfère un compteur propre à chaque code.
- Tout changement de fiche fait avancer l'indice : trop de bruit ; seul un nouveau produit compte.

## Conséquences
Migration `0005_diffusion` ; `services/diffusion.py` (`issue_sheets`, `revert_last_diffusion`, `next_letter`), routes `POST /projects/{id}/exports/sheets` et `DELETE /projects/{id}/diffusions/last` (fin de `GET …/sheets.pdf` et des routes `/indice`) ; fenêtre `SheetsDialog`, historique et colonne d'indice par code dans l'interface.
