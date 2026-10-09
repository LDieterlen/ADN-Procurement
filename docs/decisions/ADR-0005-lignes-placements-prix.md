# ADR-0005 — Lignes, placements, prix figés et statuts
Date : 2026-10-09
Statut : acceptée (étape 2, 2026-10-09 : décisions D2.1 à D2.15 du JOURNAL ; rejeu des 12 cas = DATA_MODEL §10)

## Contexte
Résidentiel et hôtellerie : une même lampe peut être prescrite dans plusieurs zones, une zone « Chambre A » vaut × 12. Prix d'achat HT, remise fournisseur, plusieurs devises, TVA ; totaux et budgets en EUR net HT. La marge de revente et les options A/B n'ont pas de réponse de l'utilisateur à ce jour.

## Décision
- `project_item` = spécification figée à la création (copie depuis produit, fournisseur, projet ; nullabilité : DATA_MODEL §4.11) : `name`, `finish`, `materials`, `color`, `unit`, `supplier_id`, `unit_cost_cents` + `currency` + `fx_rate_micro`, `discount_bp`, `vat_rate_bp`, `lead_time_weeks`, `kind` (ffe/ose/custom/existing/fee) ; `item_code` `<CAT>-NNN` unique par projet via `code_sequence`. Un changement du prix catalogue n'affecte jamais la ligne.
- `project_item_placement` = N zones × `qty_milli` (`zone_id` NULL = non affecté, `UNIQUE(project_item_id, COALESCE(zone_id, 0))`) ; quantité totale = Σ qty × `zone.multiplier`.
- Formules (`money.py`) : `net = round(unit_cost × (10000 − discount_bp) / 10000)` ; `net_eur = round(net × fx_rate_micro / 1e6)` ; `total_ht = round(net_eur × qty_milli / 1000)` ; TVA par taux sur la somme HT.
- Statuts : draft, specified, quoted, approved, ordered, delivered, installed, cancelled, replaced ; `on_hold` booléen orthogonal. Transitions libres avec confirmation jusqu'à `ordered` ; au-delà, retour impossible sauf `cancelled` avec note ; `ordered` exige `order_ref`.
- `approved` pose le snapshot `approved_at`, `approved_unit_net_cents`, `approved_total_qty_milli`. Remplacement après validation = nouvelle ligne reprenant le code, ancienne passée `replaced` avec `replaced_by_id`.
- `project_item_event` en ajout seul, écrit dans la même transaction : `created` à la création, `status` à chaque transition ; prix, quantité, produit, placement journalisés à partir de `approved` (un brouillon corrigé reste supprimable). `cancelled` et `replaced` non comptés ; `existing` compté en quantité, exclu des montants ; `fee` exclu du book.

## Alternatives écartées
- `zone_id` + `qty` directement sur la ligne : oblige à dupliquer la spécification et le code article par pièce.
- Prix hérités à la lecture (`COALESCE` produit/fournisseur) : précédence invisible, totaux mouvants.
- Devise unique EUR (livrables initiaux) : écartée par l'utilisateur ; cas « fournisseur en GBP » rejoué à l'étape 2.

## Conséquences
Tranché à l'étape 2 (défauts confirmés) : marge de revente → rien en v1, ajout additif prévu `project_item.markup_bp`, `project_item.unit_sell_override_cents`, `setting.pricing_mode` ; options A/B → hors v1, ajout `project_item.alternative_of_id` ; frais → lignes forfaitaires `kind='fee'` par fournisseur (catégorie FRA) ; snapshot en EUR seul ; `replaced` depuis `approved` seulement ; `cancelled → draft` refusé après `ordered` ; Validé par zone approché au prix courant. Statuts `in_production` et `shipped` arrivent avec l'étape 10.

## Repli
Si le rejeu de l'étape 2 contredit un point, cette ADR est remplacée avant la migration 0005 (aucune donnée réelle avant l'étape 6a). Les ajouts listés sont des `ADD COLUMN` nullables : aucune recréation de table.
