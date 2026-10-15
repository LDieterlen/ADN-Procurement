# ADR-0010 — Exports PDF : WeasyPrint + Jinja2, book client et bon de commande, note de licence des images
Date : 2026-10-11
Statut : à confirmer (étape F2, défaut en mode enchaîné)

## Contexte
L'étape F2 produit le book client (une page par article, regroupé par zone, photo principale) et le bon de commande imprimable (coordonnées agence et fournisseur). Vérifié le 2026-10-11 : WeasyPrint 70 s'installe et rend un PDF dans le devcontainer sans dépendance système supplémentaire. Les photos viennent de `files/` ; leur droit d'usage doit pouvoir être noté.

## Décision
- Bibliothèques (ajout à ADR-0001, `api/`) : **WeasyPrint 70** (HTML + CSS → PDF, `write_pdf()`) et **Jinja2 3.1** (gabarits `api/src/ffe/exports/templates/*.html`, autoescape). Le HTML est rendu à partir des DTO (`ProjectItemRead`, `PoRead`, synthèse) : aucune somme dans le gabarit, aucun accès à la base depuis le gabarit.
- Book client : `GET /projects/{id}/exports/book.pdf` ; couverture (agence, projet, client, date), puis **une page par article**, par zone dans l'ordre des zones, lignes `fee`, annulées et remplacées exclues ; photo principale de la ligne, sinon du produit (DATA_MODEL §4.15), insérée par chemin local (`base_url = files/`) ; description client, finition, dimensions, quantité ; jamais de prix d'achat ni de fournisseur. Pas de vignettes (DF2.2, défaut) : l'image est réduite par le CSS d'impression.
- Bon de commande : `GET /purchase-orders/{id}/pdf` ; en-tête agence (réglages), fournisseur (adresse, contact), livraison, lignes (réf., désignation, qté, PU, remise, net HT devise), totaux HT devise, contre-valeur EUR hors EUR, TVA/TTC en EUR seulement, conditions de paiement, notes.
- Conservation : book → `project_file (kind = 'book_pdf', variant = 'client')` ; BC → `purchase_order_file` (jointure créée une fois par fichier, même sur un BC clos : réimpression) ; octets par `store_bytes` (ADR-0009).
- `file.license_note TEXT NULL` (migration 0012, ADD COLUMN) : note de droit d'usage d'une image (« photo fournisseur, usage interne »), modifiable par `PATCH /products/{id}/files/{fileId}` (`licenseNote`), imprimée en petit sous la photo du book quand elle existe.

## Alternatives écartées
- Impression navigateur seule (10b) : pas de document conservé ni envoyable.
- ReportLab : mise en page programmatique, lourde pour un book maquetté en CSS.
- Vignettes stockées : du calcul et du stockage pour une image que le CSS réduit déjà.

## Conséquences
`exports/pdf.py` (environnement Jinja2 + rendu WeasyPrint), `exports/book_pdf.py`, `exports/po_pdf.py`, routes dans `api/v1/export.py` et `purchase_order.py`, liens « Book PDF » (onglet Lignes) et « PDF » (carte du BC), champ « Licence » sur les fichiers d'un produit ; tests sur le HTML rendu (contenu, absence de prix) et sur le PDF (en-tête, nombre de pages).

## Repli
Autre moteur PDF = remplacer `exports/pdf.render_pdf` ; gabarits inchangés.

Complément (2026-10-13) : fiches redessinées d'après la maquette de l'utilisateur (« Fiche déco 1b Catalogue », `references/Fiche deco/`, hors dépôt) ; polices embarquées dans `exports/assets/` (Playfair Display, IBM Plex Sans, IBM Plex Mono, licence SIL OFL, fichiers du dépôt Google Fonts) et logo monochrome, atteints par URL de fichier : aucun réseau au rendu. Les blocs sont des tableaux, pas des grilles CSS, que WeasyPrint rend mal.

Complément (2026-10-15) : maquette v2 (`Spec fiche 1b.md`) ; titres en Newsreader (OFL, `exports/assets/`) à la place de Playfair Display ; **Pillow** (`pillow>=12.3`, déjà installé par WeasyPrint, déclaré en dépendance directe) lit les proportions et les bords des images : la bande garde la grille fixe de la maquette (`pdf.band_layout`) ; finition et photo d'ambiance remplissent leur case (recadrage), une photo studio ou un plan sur fond uni est montré entier, son fond prolongé jusqu'aux bords de la case par étirement de ses colonnes ou lignes extrêmes (`pdf.padded_image`, image JPEG intégrée au PDF à 192 dpi).
