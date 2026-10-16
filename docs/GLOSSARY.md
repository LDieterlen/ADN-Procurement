# Glossaire FR / EN

Référence pour nommer les choses : le **français** dans l'UI, les documents et les commits ; l'**anglais** dans le code, les tables et les colonnes. La colonne « Où ça vit » renvoie au modèle de `docs/DATA_MODEL.md` (recentré le 2026-10-12, ADR-0013 ; v1 déclarée le 2026-10-14, ADR-0020).

## Métier

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| Mobilier, agencement et équipement | FF&E (Furniture, Fixtures & Equipment) | Éléments mobiles ou démontables prescrits par l'architecte d'intérieur ; capitalisés par le client. | `project_item.kind = 'product'` (défaut) |
| Petit équipement d'exploitation | OS&E (Operating Supplies & Equipment) | Linge, vaisselle, consommables ; acheté par l'exploitant. | `project_item.family = 'ose'` (code de la liste `family`) |
| Procurement / achats FF&E | Procurement | Chaîne prescription → chiffrage → validation → acompte → achat. | Le statut unique de l'article (ADR-0013) |
| Type de produit | Product type | Assise, table, tapis, luminaire décoratif… (21 types seedés) ; son code forme le milieu du code FF&E. | `category.code` |
| Famille | Family | Nature de sourcing : pièce sur-mesure, agencement, OS&E, pièce d'édition, pièce de galerie, artwork, confection ; valeurs éditables (liste `family`), facultative, axe de budget. | `project_item.family` (code d'un `choice`) |
| Usage | Usage | Intérieur ou extérieur (liste `usage` éditable) ; facultatif. | `project_item.usage` (code d'un `choice`) |
| Localisation | Location | Lieu de destination dans un projet (lobby, bar, chambre typo A, suite…) avec sa zone, son niveau et son nombre ; un article s'implante dans plusieurs localisations. | `location` (ADR-0013) |
| Zone | Zone | Regroupement de localisations : Zones communes, Hébergement, Back of house… texte libre, axe de budget. | `location.zone` |
| Niveau | Level | Étage de la localisation : R0, R+1… | `location.level` |
| Diffusion | Issue / issued set | Émission officielle des fiches au client, choisie dans la fenêtre « Fiches PDF » (case « Diffusion officielle ») et numérotée (diffusion 1, 2…) ; la première fige les codes ; la dernière peut s'annuler (codes et articles remis, PDF gardés, marqués annulés) (ADR-0022). Avant la première diffusion, tout article se supprime et les codes se tassent (ADR-0021) ; après, un article diffusé s'annule. | `project_diffusion` ; `project_file.diffusion_id`, `project_item.first_diffusion_id` |
| Profil de listing | Listing profile | Jeu de colonnes du listing PDF choisi selon le destinataire (« Client », « Installation », « Achats »…), créé et modifié dans Réglages (ADR-0023). | `listing_profile` |
| Planche d'installation | Installation sheet | Partie d'une pièce (« Coin TV » du salon) imprimée en A3 pour la pose : le plan et les articles (photo, code) dans leurs cases, selon la disposition choisie ; plusieurs pages au-delà de 8, 12 ou 16 articles (ADR-0024). | `installation_sheet` |
| Plan (d'installation) | Floor plan | Image ou PDF (1re page) d'une pièce, redressé et débarrassé de ses marges blanches au dépôt, dessiné sur les planches (tournable de 90°) ; un même plan sert à plusieurs planches. | `installation_plan` |
| Pièce (installation) | Room | Nom donné à la localisation d'une planche d'installation (« Salon ») ; même chose qu'une localisation. | `location` |
| Disposition | Arrangement | Place des articles autour du plan sur une planche : autour, à gauche et à droite, en haut et en bas, à droite du plan (ADR-0024). | `installation_sheet.arrangement` |
| Case vide | Empty cell | Case laissée libre dans l'ordre d'une planche, pour placer un article en face de sa place sur le plan. | `installation_sheet_item.position` |
| Repère | Marker | Pastille numérotée posée sur le plan d'une planche, au numéro de la carte de l'article ; plusieurs par article (4 chaises, 4 repères). | `installation_sheet_marker` |
| Document de travail | Working document | Fiches émises sans diffusion officielle : imprimées avec les indices en direct (ceux que la prochaine diffusion donnera), elles ne changent rien. | `project_file` avec `diffusion_id` NULL |
| Indice (par code) | Revision index | Lettre propre à chaque code FF&E : « - » au départ (y compris pour un code ajouté plus tard), puis A, B… quand le produit présenté sous ce code change (option retenue) ; l'évolution d'une diffusion à l'autre est marquée à part (« Nouveau », « Modifié ») ; un changement de caractéristiques ne compte pas ; ne bouge qu'à une diffusion (ADR-0022, remplace l'indice déclaré sur le projet). | `project_item_placement.indice`, `diffused_item_id` |
| Indice de devis | Quote revision | Lettre de la version du devis fournisseur (A, B…), saisie sur l'article. | `project_item.quote_indice` |
| Prescription / spécification | Specification / to specify | Choisir et documenter un produit précis pour un emplacement. | `project_item` |
| Listing FF&E | FF&E schedule | Tableau synthétique des articles : code, type, désignation, référence, fournisseur, quantité, montant HT, état, indice. | Page projet ; `GET …/exports/list.pdf` (ne change rien) |
| Fiches de prescription / fiche de spec | Specification sheets / spec book | Fiches illustrées, une par article et par implantation, remises au client ; jamais de prix ; options seulement sur demande. | `POST …/exports/sheets` (fenêtre « Fiches PDF ») ; `fee` exclu |
| Fiche technique | Cut sheet / tear sheet / datasheet | Document fabricant : dimensions, finitions, normes. | Fichier d'article `kind = 'other'` (aucune catégorie dédiée) ; `file` |
| Délai de livraison | Lead time | Durée annoncée entre commande et disponibilité, texte libre sur l'article, imprimé sur la fiche ; deviné dans la page capturée. | `project_item.lead_time`, `capture.lead_time` |
| Date de besoin sur site | Required on site | Date à laquelle l'article doit être livré sur le chantier. | Retiré par ADR-0013 ; accroche DATA_MODEL §8 |
| Commander avant le | Order-by date | Date limite de commande ; calculée. | Retiré par ADR-0013 |
| Demande de prix / consultation | RFQ (Request for Quotation) | Demande de devis à un ou plusieurs fournisseurs. | Export PDF (F2) ; aucune table |
| Devis | Quote / quotation | Offre de prix du fournisseur ; numéro, indice et lien portés par l'article. | `project_item.quote_ref`, `quote_indice`, `quote_url` |
| Bon de commande | Purchase order (PO) | Engagement contractuel d'achat. | Retiré par ADR-0013 (tag `v0-complet`) ; statuts `deposit`, `purchased` |
| Réception / livraison | Delivery / receipt | Arrivée des articles. | Retiré par ADR-0013 |
| Frais de livraison et d'emballage | Delivery and packing fees | Ligne forfaitaire par fournisseur, comptée dans le budget, absente des fiches. | `project_item.kind = 'fee'` |
| Facture fournisseur | Supplier invoice | Acompte, solde ou facture unique. | Retiré par ADR-0013 |
| Acompte | Deposit | Paiement partiel à la commande. | statut `deposit` |
| Chambre témoin | Model room / mock-up room | Chambre prototype pour valider les choix avant série. | Une `location` ordinaire (`multiplier = 1`) |
| Type de chambre, par clé | Room type, per key | Unité de chiffrage hôtelier : « chambre typo A » ×24. | `location.multiplier` |
| Tissu client | COM (Customer's Own Material) | Tissu fourni par l'agence au fabricant, avec métrage. | Texte dans `project_item.finish` |
| Sur mesure | Custom / bespoke | Fabriqué d'après dessin de l'agence. | `project_item.family = 'custom'` (code de la liste `family`) |
| Plan | Drawing | Dessin coté de l'agence ou du fabricant, imprimé sur la fiche. | `project_item_file.kind = 'drawing'` |
| Finition (fichier) | Finish sample | Image d'un échantillon de finition (tissu, bois, métal), classée à la main, imprimée sur la fiche (migration `0002`, 2026-10-15). | `project_item_file.kind = 'finish'` |
| Représentant | Representative | Contact du fournisseur imprimé sur la fiche de spec (nom, téléphone, e-mail). | `supplier.contact_name`, `phone`, `email` |
| Validation | Approval | Accord du client sur une fiche ; case « Validation » de la fiche imprimée, statut `approved`. | `project_item.status` |

## Budget et montants

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| Budget / enveloppe / prévisionnel | Budget / allowance | Objectif net HT en EUR posé pour le projet, une localisation, une zone, une famille ou un fournisseur. | `budget_line` (scope) |
| Compilation | Breakdown | Totaux par localisation, zone, famille, type ou fournisseur, avec prévisionnel, prescrit, devisé, validé et reste. | `GET /projects/{id}/summary` |
| Prescrit | Specified / estimated | Σ des articles non annulés. | Calculé par `money.py` |
| Devisé | Quoted | Σ des articles de statut Devisé, À revoir, Validé, Acompte ou Acheté. | Calculé par `money.py` |
| Validé | Approved | Σ des articles de statut Validé, Acompte ou Acheté. | Calculé par `money.py` |
| Part par état | Share by status | Montant et pourcentage de chaque statut dans le prescrit. | `summary.byStatus` |
| Engagé / facturé / payé | Committed / invoiced / paid | Suivi des commandes et factures. | Retiré par ADR-0013 |
| Prix unitaire HT | Unit cost | Prix HT avant remise, avec sa devise, saisi sur l'article. | `project_item.unit_cost_cents`, `project_item.currency` |
| Remise professionnelle | Trade discount | Réduction accordée aux prescripteurs, en points de base. | `project_item.discount_bp` |
| Prix net | Net price | `unit_cost × (10000 − discount_bp) / 10000`, arrondi au centime. | Calculé par `money.py` ; jamais stocké |
| HT | Excl. tax | Tous les montants sont saisis, stockés et affichés HT ; pas de TVA (accroche DATA_MODEL §8). | colonnes `*_cents` |
| Devise / taux de change | Currency / FX rate | ISO 4217 par ligne ; 1 unité = `fx_rate_micro` / 1 000 000 EUR, figé par ligne ; totaux en EUR. | `project_item.currency`, `fx_rate_micro` ; `setting.base_currency` |
| Centime | Cent | Unité de stockage de tout montant (INTEGER). | colonnes `*_cents` |
| Point de base | Basis point (bp) | 1/100 de pour cent ; 10 000 = 100 % ; tout taux est un INTEGER en bp. | colonnes `*_bp` |
| Millième | Thousandth (milli) | Unité des quantités (INTEGER) ; 12,5 m² = 12 500. | colonnes `*_qty_milli`, `qty_milli` |
| Coefficient / marge de revente | Markup / margin | Rapport prix de vente / prix net. Inconnu à ce jour ; hors v1. | Reporté : `markup_bp`, `pricing_mode` (ADR-0005) |

## Modèle et structure

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| Projet | Project | Conteneur : client, statut, budget global, échéance, adresse du chantier. | `project` |
| Implantation | Placement | Article × localisation × quantité ; un article peut avoir plusieurs implantations ; localisation NULL = « non affecté ». | `project_item_placement` |
| Nombre / multiplicateur | Multiplier | Nombre d'exemplaires d'une localisation type (défaut 1). | `location.multiplier` |
| Article | Project item | Instance projet d'une fiche de prescription : nom, référence, fournisseur, dimensions, finitions, prix, devise, statut. Entité pivot. | `project_item` |
| Quantité totale | Total quantity | Σ `qty_milli × location.multiplier` sur les implantations ; calculée. | `money.py` |
| Code FF&E | Item code / tag | `<LOC>-<TYPE>-NN` (`CHA-LUD-01`), un par implantation (ADR-0018) ; `FR-NN` pour les frais ; option : code de la base suivi de sa lettre (`CHA-LUD-01-A`) ; plus petit numéro libre, tassé avant la première diffusion, figé ensuite (ADR-0021/0022) ; unique par projet, sur plans et fiches. | `project_item_placement.code` ; frais : `project_item.item_code` |
| Fournisseur | Supplier / vendor | Qui vend (marques comprises) ; porte le savoir-faire, le représentant (imprimé sur les fiches) et un second contact ; devise par défaut masquée dans l'interface, plus de remise par défaut (2026-10-13 : la remise se saisit sur l'article). | `supplier` |
| Professionnel | Professional | Entrée de l'annuaire : fabricant (atelier, artisan particulier), distributeur, éditeur de tissu ou artisan d'art, avec savoir-faire et deux contacts. **Jamais rattaché** à un produit ni à un article (ADR-0015) ; la marque lue sur une page produit est un fournisseur. | `professional`, `professional.kind` (code de la liste `prestation`) |
| Savoir-faire | Specialty | Ce que fait un fournisseur ou un professionnel (Confection, Tapis, Luminaire…), texte libre issu de l'annuaire. | `supplier.specialty`, `professional.specialty` |
| Client / donneur d'ordre | Client | Particulier ou société pour qui le projet est mené. | `client` |
| Nom | Product name | Nom complet du produit, obligatoire dans le formulaire. | `project_item.product_name` |
| Désignation | Designation | Libellé court de l'article, titre des fiches PDF ; vide → le nom. | `project_item.name` |
| Référence | Reference | Numéro de modèle ou code de l'article. | `project_item.reference` |
| Dimensions | Dimensions | Texte libre : « L 120 × P 60 × H 75 cm », « Ø 36 cm ». | `project_item.dimensions` |
| Finitions | Finish | Description libre de l'aspect. | `project_item.finish` |
| Lien internet | Web link | Adresse de la fiche produit, imprimée sur la fiche de spec. | `project_item.source_url` |
| Commentaires | Comments | Texte imprimé sur la fiche de prescription. | `project_item.comments` |
| Statut / état | Status | À chiffrer, Devisé, À revoir, Validé, Acompte, Acheté, Annulé ; libre, journalisé. | `project_item.status` (CHECK) |
| Remplacé | Replaced / substituted | Ligne retirée au profit d'une autre ; lien non tracé en v1. | Reporté : `replaced_by_id` (DATA_MODEL §8) |
| Option | Alternative (A/B) | Variante d'un article de base présentée au client (A, B, C…) : même type, implantations et codes de la base suivis de la lettre, jamais comptée dans les totaux ; « retenir » échange les rôles, « détacher » en refait un article, « rattacher » fait d'un article existant une option (ADR-0021). | `project_item.option_of_id`, `option_letter` |
| Historique / événement | Event log | Journal en ajout seul des changements de statut, de prix, de fiche (champs nommés), de fichiers, d'option, d'indice et d'implantation (codes compris) d'un article. | `project_item_event` |
| Archivage | Archiving | Masquer sans supprimer ; la suppression physique est bornée (article : jamais diffusé, un article diffusé s'annule, jamais une base qui a des options, ADR-0021/0022 ; localisation vide ; implantation, jamais la dernière ; ligne de budget ; profil de listing ; plan d'installation inutilisé ; planche d'installation ; fichier que plus rien ne désigne). | colonnes `archived_at` ; index `(archived_at, name)` ; les UNIQUE métier s'appliquent aussi aux archivés ; doublon d'un archivé détecté par le service → 409 `archivedId` |
| Objet de transfert | DTO (Data Transfer Object) | Forme JSON d'une ressource renvoyée par l'API, sans champ calculé. | schéma Pydantic `XxxRead` (`schemas/`) |
| Fichier joint | Attachment / file | Photo, finition, plan ou autre document ; dédoublonné par hash, stocké hors base ; supprimé du disque quand plus rien ne le référence. | `file.sha256` ; `project_item_file`, `project_file`, `capture_image` ; `~/.persist/ffe/files/` |
| Réglages | Settings | Une seule ligne : agence (nom, adresse, e-mail, téléphone), devise de base, préfixe de code projet, jeton de l'extension. | `setting` (`CHECK id = 1`) |
| Liste | List (choice) | Valeurs éditables sur la page « Listes » : familles, usages, prestations ; code immuable généré du nom, libellé éditable, archivable ; vérifiées par le service (422), sans CHECK en base. | `choice` (`list`, `code`, `name`) |

## Identifiants d'entreprise et données externes

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| SIREN | SIREN | Identifiant d'une entreprise française, 9 chiffres. | `client.siren` (CHECK 9 chiffres) ; fournisseur : accroche F3 |
| SIRET | SIRET | Identifiant d'un établissement, 14 chiffres (SIREN + NIC). | Aucune colonne ; accroche F3 (`supplier.siret`, DATA_MODEL §8) |
| N° de TVA intracommunautaire | EU VAT number | Identifiant TVA UE (`FR` + 11 caractères) ; vérifiable via VIES (F3). | Aucune colonne ; accroche F3 (`supplier.vat_number`) |
| Recherche d'entreprises | Company registry lookup | API DINUM gratuite ; VIES pour l'UE ; dirigeants jamais stockés. | F3 ; `supplier.registry_*`, `supplier_registry_snapshot` (reportés) |
| Non diffusible | Non-public registry entry | Entreprise (souvent un artisan ou un particulier) ayant demandé l'opacité de ses données au registre : absente ou tronquée dans les résultats, à saisir à la main. | F3 ; aucune colonne |
| Boîte de réception / capture | Inbox / capture | Fiche produit envoyée depuis Chrome par l'extension (ADR-0017), en attente sur « Nouvel article » ; consommée à la création de l'article. | `capture`, `capture_image` ; `GET /captures` |
| JSON-LD | JSON-LD | Données structurées `schema.org/Product` présentes dans la plupart des pages produit ; source de la capture. | F5/F6 ; `captures/extract.py` |
| URL source | Source URL | Page web d'origine d'un article ou d'une image. | `project_item.source_url`, `file.source_url` |
