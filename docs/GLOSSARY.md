# Glossaire FR / EN

Référence pour nommer les choses : le **français** dans l'UI, les documents et les commits ; l'**anglais** dans le code, les tables et les colonnes. La colonne « Où ça vit » renvoie au modèle de `docs/DATA_MODEL.md` (recentré le 2026-10-12, ADR-0013).

## Métier

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| Mobilier, agencement et équipement | FF&E (Furniture, Fixtures & Equipment) | Éléments mobiles ou démontables prescrits par l'architecte d'intérieur ; capitalisés par le client. | `project_item.kind = 'product'` (défaut) |
| Petit équipement d'exploitation | OS&E (Operating Supplies & Equipment) | Linge, vaisselle, consommables ; acheté par l'exploitant. | `project_item.family = 'ose'` |
| Procurement / achats FF&E | Procurement | Chaîne prescription → chiffrage → validation → acompte → achat. | Le statut unique de l'article (ADR-0013) |
| Type de produit | Product type | Assise, table, tapis, luminaire décoratif… (19 types seedés) ; son code forme le milieu du code FF&E. | `category.code` |
| Famille | Family | Nature de sourcing : pièce sur-mesure, agencement, OS&E, pièce d'édition, pièce de galerie, artwork, confection ; facultative, axe de budget. | `project_item.family` |
| Usage | Usage | Intérieur ou extérieur ; facultatif. | `project_item.usage` |
| Localisation | Location | Lieu de destination dans un projet (lobby, bar, chambre typo A, suite…) avec sa zone, son niveau et son nombre ; un article s'implante dans plusieurs localisations. | `location` (ADR-0013) |
| Zone | Zone | Regroupement de localisations : Zones communes, Hébergement, Back of house… texte libre, axe de budget. | `location.zone` |
| Niveau | Level | Étage de la localisation : R0, R+1… | `location.level` |
| Indice | Revision index | Lettre de diffusion déclarée sur le projet (« Nouvel indice » : A, B, C…) ; un article porte la lettre de la déclaration où il a changé pour la dernière fois ; un PDF porte la lettre courante au moment de l'émission, la dernière fiche émise depuis la déclaration est la référence. | `project.indice`, `project_file.indice`, `project_item.indice` |
| Indice de devis | Quote revision | Lettre de la version du devis fournisseur (A, B…), saisie sur l'article. | `project_item.quote_indice` |
| Prescription / spécification | Specification / to specify | Choisir et documenter un produit précis pour un emplacement. | `project_item` |
| Listing FF&E | FF&E schedule | Tableau synthétique des articles : code, type, désignation, référence, fournisseur, quantité, montant HT, état, indice. | Page projet ; `GET …/exports/list.pdf` |
| Fiches de prescription / fiche de spec | Specification sheets / spec book | Fiches illustrées, une par article, remises au client ; jamais de prix. | `GET …/exports/sheets.pdf` ; `fee` exclu |
| Fiche technique | Cut sheet / tear sheet / datasheet | Document fabricant : dimensions, finitions, normes. | `product_file.kind = 'datasheet'` ; `file` |
| Délai de livraison | Lead time | Durée entre commande et disponibilité. | Retiré par ADR-0013 ; accroche DATA_MODEL §8 |
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
| Sur mesure | Custom / bespoke | Fabriqué d'après dessin de l'agence. | `project_item.family = 'custom'` |
| Dessin | Drawing | Dessin coté de l'agence ou du fabricant, imprimé sous la photo de la fiche. | `project_item_file.kind = 'drawing'` |
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
| Code FF&E | Item code / tag | `<LOC>-<TYPE>-NN` (`CHA-LUD-01`), `FR-NN` pour les frais ; unique par projet, sur plans et fiches. | `project_item.item_code` ; `item_code_sequence` |
| Fournisseur | Supplier / vendor | Qui vend (marques comprises) ; porte le savoir-faire, le représentant (imprimé sur les fiches), un second contact, la devise et la remise par défaut. | `supplier` |
| Professionnel | Professional | Entrée de l'annuaire : fabricant (atelier, artisan particulier), distributeur, éditeur de tissu ou artisan d'art, avec savoir-faire et deux contacts. **Jamais rattaché** à un produit ni à un article (ADR-0015) ; la marque lue sur une page produit est un fournisseur. | `professional`, `professional.kind` |
| Savoir-faire | Specialty | Ce que fait un fournisseur ou un professionnel (Confection, Tapis, Luminaire…), texte libre issu de l'annuaire. | `supplier.specialty`, `professional.specialty` |
| Client / donneur d'ordre | Client | Particulier ou société pour qui le projet est mené. | `client` |
| Référence | Reference | Numéro de modèle ou code de l'article. | `project_item.reference` |
| Dimensions | Dimensions | Texte libre : « L 120 × P 60 × H 75 cm », « Ø 36 cm ». | `project_item.dimensions` |
| Finitions | Finish | Description libre de l'aspect. | `project_item.finish` |
| Lien internet | Web link | Adresse de la fiche produit, imprimée sur la fiche de spec. | `project_item.source_url` |
| Commentaires | Comments | Texte imprimé sur la fiche de prescription. | `project_item.comments` |
| Statut / état | Status | À chiffrer, Devisé, À revoir, Validé, Acompte, Acheté, Annulé ; libre, journalisé. | `project_item.status` (CHECK) |
| En attente | On hold | Décision client en suspens ; compté mais signalé. | `project_item.on_hold` |
| Remplacé | Replaced / substituted | Ligne retirée au profit d'une autre ; historique conservé. | `project_item.status = 'replaced'`, `replaced_by_id` |
| Option / alternative | Alternative (A/B) | Variantes présentées au client ; une seule retenue. Hors v1. | Reporté : `alternative_of_id` (D0.14) |
| Historique / événement | Event log | Journal en ajout seul des changements de statut, de prix et d'implantation d'un article. | `project_item_event` |
| Archivage | Archiving | Masquer sans supprimer ; la suppression physique est bornée (article à chiffrer sans événement, localisation vide, implantation, ligne de budget). | colonnes `archived_at` ; index `(archived_at, name)` ; les UNIQUE métier s'appliquent aussi aux archivés ; doublon d'un archivé détecté par le service → 409 `archivedId` |
| Objet de transfert | DTO (Data Transfer Object) | Forme JSON d'une ressource renvoyée par l'API, sans champ calculé. | schéma Pydantic `XxxRead` (`schemas/`) |
| Fichier joint | Attachment / file | Photo, fiche technique, devis ; dédoublonné par hash, stocké hors base. | `file.sha256` ; `product_file`, `project_item_file` ; `~/.persist/ffe/files/` |
| Description client / notes internes | Client description / internal notes | Texte visible dans le book vs texte réservé à l'agence. | `project_item.client_description`, `internal_notes` |
| Réglages | Settings | Une seule ligne : agence, TVA et contingence par défaut, devise de base, préfixe de code projet. | `setting` (`CHECK id = 1`) |

## Identifiants d'entreprise et données externes

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| SIREN | SIREN | Identifiant d'une entreprise française, 9 chiffres. | `client.siren`, `supplier.siren` (CHECK 9 chiffres) |
| SIRET | SIRET | Identifiant d'un établissement, 14 chiffres (SIREN + NIC). | `supplier.siret` (UNIQUE partiel, cohérent avec `siren`) |
| N° de TVA intracommunautaire | EU VAT number | Identifiant TVA UE (`FR` + 11 caractères) ; vérifiable via VIES (F3). | `supplier.vat_number` ; `setting` (agence) |
| Recherche d'entreprises | Company registry lookup | API DINUM gratuite ; VIES pour l'UE ; dirigeants jamais stockés. | F3 ; `supplier.registry_*`, `supplier_registry_snapshot` (reportés) |
| Non diffusible | Non-public registry entry | Entreprise (souvent un artisan ou un particulier) ayant demandé l'opacité de ses données au registre : absente ou tronquée dans les résultats, à saisir à la main. | F3 ; aucune colonne |
| Boîte de réception / capture | Inbox / capture | Fiche produit envoyée depuis Chrome par l'extension (ADR-0017), en attente sur « Nouvel article » ; consommée à la création de l'article. | `capture` ; `GET /captures` |
| JSON-LD | JSON-LD | Données structurées `schema.org/Product` présentes dans la plupart des pages produit ; source de la capture. | F5/F6 ; `captures/extract.py` |
| URL source | Source URL | Page web d'origine d'un article ou d'une image. | `project_item.source_url`, `file.source_url` |
