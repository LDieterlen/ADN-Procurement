# ADR-0024 — Planches d'installation : plan au centre, articles autour, en A3
Date : 2026-10-16
Statut : acceptée (demande et questionnaire du 2026-10-16, défauts recommandés retenus)

## Contexte
Pour la pose finale, il faut une feuille par partie de pièce : le plan au centre, les articles autour (photo et code), pour que l'équipe sache quoi poser où. Une pièce (localisation) se découpe en parties (salon : coin TV, cheminée, entrée…), avec un plan chacune ou un plan commun.

## Décision
- **Plan** (`installation_plan`) : image (JPEG, PNG, WebP) ou PDF ; un PDF est rendu une fois, à l'envoi, en PNG de sa 1re page (environ 200 dpi, 5 000 px au plus) par **pypdfium2** (`>=4.30`, 5.14 au verrou ; nouvelle dépendance), le PDF reste attaché (`source_file_id`). Un plan sert à plusieurs planches et ne se supprime pas tant qu'une planche l'utilise.
- **Planche** (`installation_sheet`) : une pièce (`location_id`), un nom (« Coin TV »), un plan facultatif, un gabarit de **8, 12 ou 16 articles par page** (12 par défaut). Au-delà, d'autres pages, chacune avec le plan.
- **Articles** (`installation_sheet_item`) : des implantations de la pièce (le code est celui de l'implantation, ADR-0018), dans une liste ordonnée réglée par ↑ ↓. Une implantation peut figurer sur **plusieurs planches** ; c'est indiqué (« Aussi sur »), et celles qui ne sont sur aucune planche sont proposées en premier. Les articles annulés, les frais et les options ne sont pas proposés.
- **Position des articles réglable par planche** (`arrangement`, `ffe/installation.layout`) : **autour du plan** (défaut, sens horaire depuis le coin haut gauche), **à gauche et à droite**, **en haut et en bas**, **à droite du plan** (le plan garde la largeur). L'API envoie la grille de chaque disposition (largeurs, hauteurs, bloc du plan, cases) ; l'aperçu ne la recalcule pas.
- **Cases vides** : la liste peut laisser une case libre (« + Case vide »), pour placer un article en face de sa place sur le plan ; chaque article garde sa case (`position`, pages comprises), les cases vides en fin de liste tombent.
- **Orientation du plan** (`plan_rotation`) : 0°, 90°, 180°, 270° dans le sens horaire, appliquée au rendu (le fichier ne change pas). Page en portrait : non retenue. **Recadrage automatique des marges blanches** à l'ajout du plan (retenu le 2026-10-16 après essai : la pièce paraissait petite) : PDF ou image, cadre des pixels plus sombres que le papier (gris < 235) plus un filet de 1 %, appliqué seulement s'il retire plus de 5 % de la surface ; l'envoi reste attaché (`source_file_id`). Les plans déjà ajoutés ne changent pas (leurs repères restent justes).
- **Repères sur le plan** (`installation_sheet_marker`) : fenêtre plein écran **« Mettre les repères »** (zoom à la molette ou aux boutons, plan déplacé en glissant, pastilles de taille fixe à l'écran) : choisir un article de la page puis cliquer sur le plan pose une pastille portant le **numéro de sa case sur la page** (le même que sur sa carte) ; plusieurs repères par article (quatre chaises, quatre pastilles) ; une pastille se déplace en glissant, se sélectionne d'un clic et se supprime (bouton ou touche Suppr). L'aperçu de la page montre les pastilles sans les modifier. Position en millièmes du plan tel qu'enregistré, avant rotation (`ffe/installation.turn`) : les repères restent en place quand la disposition, le gabarit ou l'orientation changent.
- **Couleurs par type** (`color_by_type`, case décochée par défaut) : pastilles et cartes dans la couleur du type de produit (palette `TYPE_COLORS` de huit teintes sourdes, attribuée dans l'ordre des types du projet, la même sur toutes ses planches), légende des types de la page ; sinon pastilles à l'encre. Le numéro porte l'information, la couleur la complète (lisible aussi en noir et blanc).
- **PDF A3 paysage, téléchargé directement** : document de travail, pas rangé dans les documents émis (`project_file` inchangé). Par planche, par pièce ou pour tout le projet.
- Le mot « zone » n'est pas employé : `location.zone` désigne déjà autre chose (Zones communes, Hébergement…).

## Alternatives écartées
- Images seules : chaque plan d'architecte (PDF) aurait dû être converti hors de l'outil.
- Deux colonnes autour du plan : moins d'articles par page.
- Placement libre par glisser, ou case choisie article par article : plus complexe que la liste ↑ ↓ avec cases vides.

## Conséquences
Migration additive `0008_installation` (quatre tables vides : plans, planches, cases, repères ; index des clés étrangères complétés par `0009_fk_indexes`). Pillow (ADR-0010) sert aussi au redressement, au recadrage et à la rotation des plans. Services `installation_plan`, `installation_sheet`, `installation_pdf`, gabarit `installation.html` (en-tête partagé `_head.html`, `@page` paramétrée par `page_size`). `unlink_if_orphan` connaît les plans. Parqué : traits de rappel entre une carte et ses repères, choix de la page d'un PDF de plusieurs pages, archivage des PDF.

## Repli
Retirer l'onglet et les routes ; les quatre tables restent (migrations additives, jamais supprimées) et ne servent plus ; pypdfium2 se retire du `pyproject.toml`.
