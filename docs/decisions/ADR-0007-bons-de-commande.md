# ADR-0007 — Bons de commande : mono-projet, mono-fournisseur, numérotés par année, émission = lignes commandées
Date : 2026-10-11
Statut : à confirmer (étape 10b, défaut en mode enchaîné)

## Contexte
L'étape 10b engage les achats : un bon de commande (BC) par fournisseur regroupe des lignes validées, les verrouille (`ordered`, aucun retour) et fait apparaître l'« Engagé » dans le budget. Les lignes portent déjà prix, devise et taux figés (ADR-0005) ; `code_sequence` numérote par projet et préfixe, ce qui ne convient pas à une numérotation annuelle.

## Décision
- `purchase_order` : **un projet, un fournisseur** (D10b.2, défaut), numéro `PO-AAAA-NNN` **annuel, global, jamais décrémenté** (D10b.1) servi par la table `po_sequence (year, next_value)` (même mécanisme que `code_sequence`, clé différente), devise et `fx_rate_micro` du fournisseur et des lignes (une seule devise par BC), statuts `draft → issued → acknowledged → partially_delivered (10c) → closed`, `cancelled` depuis `draft`, `issued`, `acknowledged` ; adresse et contact de livraison copiés du projet à la création (D10b.3, chantier si pas d'adresse de livraison) et modifiables ; `payment_terms` copié du fournisseur.
- `purchase_order_line` : copie **figée** d'une ligne validée du même projet (FK composite), même fournisseur et même devise que le BC, pas en attente, une seule fois sur un BC non annulé (règle d'app, 409) : désignation, `qty_milli` (défaut : quantité totale de la ligne), prix unitaire, remise, TVA. Modifiable tant que le BC est `draft`.
- **Émettre** (`draft → issued`, ≥ 1 ligne) : une transaction qui pose `issued_on`, puis sur chaque ligne de projet `order_ref = numéro`, `expected_delivery_on` si le BC en a une, et le statut `ordered` (préconditions de `transitions.py`, événement `status`). Les lignes doivent être encore `approved` et non en attente (409 sinon).
- **Annuler** un BC émis : note obligatoire ; ses lignes de projet passent `cancelled` avec la note (ADR-0005 : aucun retour depuis `ordered`), `order_ref` conservé ; recommander = nouvelle ligne. Un BC `draft` se supprime ; son numéro n'est pas réutilisé.
- Montants : rien n'est stocké ; `money.py` calcule net unitaire, total par ligne et totaux du BC (devise et EUR, TVA sur l'EUR). **Engagé** (budget) = Σ des totaux EUR des lignes des BC `issued`, `acknowledged`, `partially_delivered`, `closed` ; par zone, approximation au prix du BC sur les placements (comme le Validé, D2.14).
- `purchase_order_file` : PDF envoyé, AR fournisseur ; même forme que `quote_file`.

## Alternatives écartées
- Numérotation par projet via `code_sequence` : un numéro de BC est un document comptable de l'agence, continu sur l'année.
- BC multi-fournisseurs ou multi-projets : un BC réel part chez un fournisseur pour un chantier.
- Statuts `in_production` / `shipped` : aucun besoin exprimé (ROADMAP « Risques ») ; ajout additif possible (CHECK, ARCHITECTURE §5).

## Conséquences
Migration 0009 (quatre tables STRICT), `services/purchase_order.py`, `money.po_totals`, bloc `engaged_cents` dans la synthèse budgétaire, routes `/projects/{id}/purchase-orders`, `/purchase-orders/{id}`, `/purchase-order-lines/{id}` (API.md), onglet « Commandes » avec document imprimable. Les réceptions et factures (10c) s'accrochent au BC.

## Repli
Préfixe du numéro et largeur (`PO-AAAA-NNN`) : constantes de `services/purchase_order.py` ; statuts supplémentaires : ajout d'une valeur au CHECK (relue, sans ADR).
