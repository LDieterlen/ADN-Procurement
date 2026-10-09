# Glossaire FR / EN

Référence pour nommer les choses : le **français** dans l'UI, les documents et les commits ; l'**anglais** dans le code, les tables et les colonnes. La colonne « Où ça vit » renvoie au modèle de `docs/DATA_MODEL.md` (brouillon jusqu'à l'étape 2) ; « étape N » signale ce qui n'existe pas encore en base.

## Métier

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| Mobilier, agencement et équipement | FF&E (Furniture, Fixtures & Equipment) | Éléments mobiles ou démontables prescrits par l'architecte d'intérieur ; capitalisés par le client. | `project_item.kind = 'ffe'` (défaut) |
| Petit équipement d'exploitation | OS&E (Operating Supplies & Equipment) | Linge, vaisselle, consommables ; acheté par l'exploitant. Hors périmètre v1 mais marquable. | `project_item.kind = 'ose'` |
| Procurement / achats FF&E | Procurement | Chaîne spécification → RFQ → devis → PO → suivi → réception → installation. | Toute l'application ; achats à l'étape 10 |
| Prescription / spécification | Specification / to specify | Choisir et documenter un produit précis pour un emplacement. | `project_item` (statut `specified`) |
| Tableau FF&E / liste de prescription | FF&E schedule | Tableau synthétique des lignes : code, zone, désignation, qté, prix, fournisseur, délai, statut. | Onglet Lignes (7b) ; export xlsx (F1) |
| Book / dossier de prescription | Specification book / spec book | Fiches illustrées, une par article, remises au client. | Impression client (7c) ; export PDF (F2) ; `fee` exclu |
| Fiche technique | Cut sheet / tear sheet / datasheet | Document fabricant : dimensions, finitions, normes. | `product_file.kind = 'datasheet'` ; `file` |
| Délai de livraison | Lead time | Durée entre commande et disponibilité, en semaines. | `product.lead_time_weeks`, `project_item.lead_time_weeks` |
| Date de besoin sur site | Required on site | Date à laquelle l'article doit être livré sur le chantier. | `project_item.required_on_site` |
| Commander avant le | Order-by date | `required_on_site` − délai − marge (14 jours par défaut) ; calculé, jamais stocké. | `money.py` (7a), colonne calculée (7c) |
| Demande de prix / consultation | RFQ (Request for Quotation) | Demande de devis à un ou plusieurs fournisseurs. | Export PDF (F2) ; aucune table |
| Devis | Quote / quotation | Offre de prix fournisseur à durée de validité. | `project_item.quote_ref`, `quote_valid_until` ; table `quote` (10a) |
| Bon de commande | Purchase order (PO) | Engagement contractuel d'achat ; un fournisseur, un projet. | `project_item.order_ref` ; table `purchase_order` (10b) |
| Réception / livraison | Delivery / receipt | Arrivée des articles, quantités reçues, réserves. | statut `delivered` ; table `delivery` (10c) |
| Réserves | Punch list / delivery issues | Défauts, manquants, dommages consignés à la réception. | `delivery_line` (10c) |
| Facture fournisseur | Supplier invoice | Acompte, solde ou facture unique ; échéance, paiement. | table `supplier_invoice` (10c) |
| Acompte / solde | Deposit / balance | Paiement partiel à la commande, reste avant livraison. | `supplier_invoice.kind` (10c) |
| Suivi de commande / relance | Expediting | Suivi de production et d'expédition auprès du fournisseur. | Hors v1 ; statuts `in_production`, `shipped` reportés |
| Chambre témoin | Model room / mock-up room | Chambre prototype pour valider les choix avant série. | Une `zone` ordinaire (`multiplier = 1`) |
| Type de chambre, par clé | Room type, per key | Unité de chiffrage hôtelier : « chambre type A » ×120. | `zone.multiplier` |
| Tissu client | COM (Customer's Own Material) | Tissu fourni par l'agence au fabricant, avec métrage. | Texte dans `project_item.finish` / `materials` |
| Sur mesure | Custom / bespoke | Fabriqué d'après dessin de l'agence, sans fiche catalogue. | `project_item.kind = 'custom'`, `product_id` NULL |
| Existant / réemploi | Existing | Article déjà possédé ; compté en quantité, exclu des montants. | `project_item.kind = 'existing'` |
| Frais | Fee | Ligne forfaitaire transport ou installation, par fournisseur ; hors book. | `project_item.kind = 'fee'` (D0.11) |
| Bon à tirer | BAT / proof | Épreuve (dessin, échantillon, maquette) signée par l'agence ou le client avant fabrication. | `project_item_file.kind = 'approval'` |
| Accusé de réception de commande | AR / order acknowledgement | Confirmation du fournisseur après commande : quantités, prix, date de livraison promise. | `project_item.expected_delivery_on` ; table `purchase_order` (10b) |

## Budget et montants

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| Budget / enveloppe | Budget / allowance | Objectif net HT en EUR posé par projet, zone et/ou catégorie. | `budget_line.amount_cents` (8) |
| Contingence | Contingency | Réserve pour imprévus, en points de base du budget. | `setting.default_contingency_bp`, `project.contingency_bp` |
| Prescrit | Specified / estimated | Σ des lignes comptées, enveloppe FF&E ; statuts et kinds comptés : DATA_MODEL §5. | Calculé par `money.py` (8) |
| Validé client | Approved | Σ `approved_unit_net_cents × approved_total_qty_milli` des lignes comptées de statut `approved` à `installed` ; définition unique : DATA_MODEL §5. | `approved_unit_net_cents`, `approved_total_qty_milli` |
| Engagé | Committed | Σ montants des PO émis non annulés. | Étape 10b ; aucune colonne en v1 |
| Facturé / payé | Invoiced / paid | Σ factures fournisseur ; Σ paiements. | Étape 10c |
| Tarif / prix catalogue | List price | Prix public ou tarif fournisseur avant remise, avec sa devise, son mode HT/TTC et sa date. | `product.list_price_cents`, `list_price_currency`, `list_price_tax_mode`, `list_price_on` |
| Remise professionnelle | Trade discount | Réduction accordée aux prescripteurs, en points de base. | `supplier.default_discount_bp`, `project_item.discount_bp` |
| Prix net | Net price | `unit_cost × (10000 − discount_bp) / 10000`, arrondi au centime. | Calculé par `money.py` ; jamais stocké sauf snapshot `approved_*` |
| HT / TTC / TVA | Excl. tax / incl. tax / VAT | Montants saisis et stockés HT ; TTC = HT + TVA par taux, calculé. | `project_item.vat_rate_bp`, `project.default_vat_bp`, `setting.default_vat_bp` |
| Devise / taux de change | Currency / FX rate | ISO 4217 par ligne ; 1 unité = `fx_rate_micro` / 1 000 000 EUR, figé par ligne ; totaux en EUR. | `project_item.currency`, `fx_rate_micro` ; `setting.base_currency` |
| Centime | Cent | Unité de stockage de tout montant (INTEGER). | colonnes `*_cents` |
| Point de base | Basis point (bp) | 1/100 de pour cent ; 10 000 = 100 % ; tout taux est un INTEGER en bp. | colonnes `*_bp` |
| Millième | Thousandth (milli) | Unité des quantités (INTEGER) ; 12,5 m² = 12 500. | colonnes `*_qty_milli`, `qty_milli` |
| Coefficient / marge de revente | Markup / margin | Rapport prix de vente / prix net. Inconnu à ce jour ; hors v1. | Reporté : `markup_bp`, `pricing_mode` (ADR-0005) |

## Modèle et structure

| FR | EN | Définition | Où ça vit |
|---|---|---|---|
| Projet | Project | Conteneur : client, statut, adresses, défauts TVA/contingence, dates. | `project` (6c) |
| Zone / pièce | Zone / area / room | Lieu de destination dans un projet ; code unique par projet. | `zone` (6c) |
| Multiplicateur / clé | Multiplier | Nombre d'exemplaires d'une zone type (défaut 1). | `zone.multiplier` |
| Ligne (FF&E) | Project item / line | Instance projet d'une spécification : prix, devise, fournisseur, délai, statut figés. Entité pivot. | `project_item` (7a) |
| Placement | Placement | Ligne × zone × quantité ; une ligne peut avoir plusieurs placements ; zone NULL = « non affecté ». | `project_item_placement` (7a) |
| Quantité totale | Total quantity | Σ `qty_milli × zone.multiplier` sur les placements ; calculée. | `money.py` |
| Code article / repère | Item code / tag | `<CAT>-NNN`, unique par projet, sur plans, book et PO. | `project_item.item_code` ; `code_sequence` |
| Catégorie | Category | Arbre à 2 niveaux ; le niveau 1 porte le code préfixe et l'axe budget. | `category` (6a), seed D0.9 |
| Catalogue produit | Product catalogue | Fiche réutilisable entre projets ; ne fige rien. | `product` (6b) |
| Fabricant / marque | Manufacturer / brand | Qui produit (Vitra). Distinct du fournisseur. | `manufacturer` (6a) |
| Fournisseur | Supplier / vendor | Qui vend et facture ; porte devise et remise par défaut, identité légale. | `supplier` (6a) |
| Client / donneur d'ordre | Client | Particulier ou société pour qui le projet est mené. | `client` (3) |
| Référence fabricant | Manufacturer reference / SKU | Numéro de modèle du fabricant. | `product.manufacturer_ref` |
| Référence fournisseur | Supplier reference | Code de l'article chez le fournisseur. | `product.supplier_ref` |
| GTIN / EAN | GTIN | Code-barres mondial de l'article, quand il existe. | `product.gtin` |
| Finition / matière / coloris | Finish / materials / color | Description structurée de l'aspect ; copiée du produit vers la ligne puis figée. | `product.finish`, `materials`, `color` ; idem `project_item` |
| Unité | Unit | pièce, paire, ensemble, lot, m, m², rouleau. | `product.unit`, `project_item.unit` |
| Statut | Status | État du cycle de vie d'une ligne : draft, specified, quoted, approved, ordered, delivered, installed, cancelled, replaced. | `project_item.status` (CHECK) |
| En attente | On hold | Décision client en suspens ; compté mais signalé. | `project_item.on_hold` |
| Remplacé | Replaced / substituted | Ligne retirée au profit d'une autre ; historique conservé. | `project_item.status = 'replaced'`, `replaced_by_id` |
| Option / alternative | Alternative (A/B) | Variantes présentées au client ; une seule retenue. Hors v1. | Reporté : `alternative_of_id` (D0.14) |
| Snapshot de validation | Approval snapshot | Prix net et quantité totale figés au passage `approved` ; répond à « que voyait le client ? ». | `approved_at`, `approved_unit_net_cents`, `approved_total_qty_milli` |
| Historique / événement | Event log | Journal en ajout seul des changements de statut et de valeur d'une ligne. | `project_item_event` (7a) |
| Archivage | Archiving | Masquer sans supprimer ; la suppression physique est bornée (brouillon sans événement, zone vide, placement, ligne de budget). | colonnes `archived_at` ; index `(archived_at, name)` ; les UNIQUE métier s'appliquent aussi aux archivés ; doublon d'un archivé détecté par le service → 409 `archivedId` |
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
| JSON-LD | JSON-LD | Données structurées `schema.org/Product` présentes dans la plupart des pages produit ; source de la capture. | F5/F6 ; `product_source.raw_json` (reporté) |
| URL source | Source URL | Page web d'origine d'un produit. | `product.source_url`, `file.source_url` |
