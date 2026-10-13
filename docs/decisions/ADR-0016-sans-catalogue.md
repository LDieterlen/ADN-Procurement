# ADR-0016 — Pas de catalogue : l'article porte toute sa fiche

- **Statut** : acceptée (2026-10-13)
- **Contexte** : le même produit revient rarement d'un projet à l'autre. Le catalogue (`product`, `product_file`, page Produits, sélecteur « depuis le catalogue », jumeau fournisseur + référence, repli de photo) ajoutait des écrans et des règles pour un cas rare, et chaque article libre y entrait par défaut : du bruit. L'utilisateur craignait aussi son volume ; en fait les fichiers sont dédoublonnés par sha256, le poids vient des photos des articles, catalogue ou non.
- **Décision** :
  - Tables `product` et `product_file` supprimées ; `project_item.product_id`, `addToCatalogue`, `catalogueImageFileId` et l'événement `product` disparaissent. Schéma régénéré (`0001_initial.py`, 15 tables), base de dev recréée.
  - L'article est la seule fiche : « Nouvel article » = « Coller une adresse » (facultatif), fiche, photo avant création, première implantation. « Coller une adresse » ne vit plus que là.
  - Routes `/products…` retirées ; `/files` reste (upload, contenu), les jointures sont celles des articles. Front : page Produits et `queries/product.ts` retirés ; l'upload et l'URL de contenu vivent dans `queries/file.ts`.
  - Réutilisation future, si le besoin apparaît : « reprendre un article d'un autre projet » (recherche dans tous les projets, copie de la fiche et de la photo), parqué dans la feuille de route.
- **Conséquences** : moins de code et d'écrans ; l'ancien code reste sous le tag `v0-complet` et dans l'historique ; aucune dépendance touchée ; les PDF lisent la photo et le dessin de l'article seulement.
- **Alternatives écartées** : catalogue en opt-in (les écrans restaient) ; garder le repli de photo (devenait inutile sans produit lié).
