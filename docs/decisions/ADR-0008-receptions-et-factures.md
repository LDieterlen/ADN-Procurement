# ADR-0008 — Réceptions et factures fournisseur : par bon de commande, réception partielle, factures et paiements en une table
Date : 2026-10-11
Statut : à confirmer (étape 10c, défaut en mode enchaîné)

## Contexte
L'étape 10c suit ce qui arrive et ce qui est payé. Le bon de commande (ADR-0007) porte les quantités commandées et les montants figés ; une ligne de projet passe `ordered → delivered → installed` sans retour (ADR-0005). La trésorerie TTC et la TVA d'achat sont hors périmètre (ROADMAP « Risques ») : on enregistre, on n'en déduit rien.

## Décision
- `delivery` : une réception = un bon de commande, une date, une référence de bon de livraison ; `delivery_line` : quantité reçue et réserves **par ligne de BC**. Réception partielle autorisée (D10c.2) : plusieurs réceptions par BC, la somme reçue par ligne ne dépasse jamais la quantité commandée (422).
- Effets d'une réception (une transaction) : ligne de projet `ordered → delivered` dès que reçu = commandé (événement `status`, note = référence et date) ; BC `issued`/`acknowledged → partially_delivered` tant qu'une ligne manque, `→ closed` quand tout est reçu. Supprimer une réception est une correction de saisie : autorisée tant qu'aucune de ses lignes n'est `installed`, elle ramène les lignes concernées à `ordered` (événement, note « réception supprimée ») et le BC à `partially_delivered` ou `acknowledged`.
- `supplier_invoice` : **factures et paiements dans une seule table** (D10c.1) : `kind` (`deposit` acompte, `balance` solde, `other`), référence fournisseur, dates de facture et d'échéance, montants HT et TVA **tels que portés par la facture**, dans la devise du BC ; `paid_on` et `payment_ref` posés au paiement. TTC = HT + TVA, calculé. Une facture payée ne se modifie ni ne se supprime.
- Budget : **Facturé** = Σ HT des factures en EUR (taux du BC), **Payé** = même somme sur les factures payées ; au niveau projet seulement (une facture n'est pas ventilée par ligne). Rien n'est stocké ni sommé en SQL.
- Aucun statut `in_production` / `shipped` : pas de besoin.

## Alternatives écartées
- Réception par ligne de projet sans BC : la quantité commandée vit sur le BC ; une réception hors BC n'a pas de référence.
- Table `payment` séparée : un paiement par facture suffit en v1 (D10c.1) ; une table additive reste possible.
- Calculer la TVA de la facture : la facture fait foi, elle peut porter une TVA étrangère ou nulle.

## Conséquences
Migration 0010 (trois tables STRICT), `services/delivery.py`, `services/supplier_invoice.py`, `money.invoice_ttc_cents` et conversion EUR, `PoRead` enrichi (reçu par ligne, réceptions, factures), bloc budget `invoiced_cents` / `paid_cents`, routes `/purchase-orders/{id}/deliveries`, `/deliveries/{id}`, `/purchase-orders/{id}/invoices`, `/invoices/{id}` (API.md), sections « Réceptions » et « Factures » de l'onglet Commandes, colonnes du budget.

## Repli
Paiements multiples : table `payment (invoice_id, paid_on, amount_cents)` additive, `paid_on` devenant dérivé ; ventilation des factures par ligne : `supplier_invoice_line` additive.
