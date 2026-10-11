"""French messages of the API. Keys are stable identifiers; texts may change freely."""

RESOURCE_LABELS: dict[str, str] = {
    "client": "client",
    "supplier": "fournisseur",
    "manufacturer": "fabricant",
    "category": "catégorie",
    "product": "produit",
    "file": "fichier",
    "project": "projet",
    "zone": "zone",
    "quote": "devis",
    "quote_line": "ligne de devis",
    "purchase_order": "bon de commande",
    "purchase_order_line": "ligne de bon de commande",
}

PROJECT_STATUS_LABELS: dict[str, str] = {
    "prospect": "Prospect",
    "active": "Actif",
    "delivered": "Livré",
    "closed": "Clos",
    "cancelled": "Annulé",
}
PROJECT_READ_ONLY = "Projet n° {id} {status} : le rouvrir (statut) avant de le modifier."
PROJECT_CODE_TAKEN = "Ce code de projet est déjà utilisé."
PROJECT_CLIENT_MUST_BE_ACTIVE = "Le client est archivé."
CLIENT_HAS_OPEN_PROJECTS = (
    "Le client n° {id} a {count} projet(s) non clos : les clore ou les annuler avant d'archiver."
)
ITEM_STATUS_LABELS: dict[str, str] = {
    "draft": "Brouillon",
    "specified": "Spécifié",
    "quoted": "Chiffré",
    "approved": "Validé",
    "ordered": "Commandé",
    "delivered": "Livré",
    "installed": "Installé",
    "cancelled": "Annulé",
    "replaced": "Remplacé",
}
ITEM_KIND_LABELS: dict[str, str] = {
    "ffe": "FF&E",
    "ose": "OS&E",
    "custom": "Sur mesure",
    "existing": "Existant",
    "fee": "Frais",
}
TRANSITION_MESSAGES: dict[str, str] = {
    "same_status": "La ligne est déjà dans ce statut.",
    "replaced_only_by_action": "« Remplacé » ne se pose que par l'action « remplacer le produit ».",
    "no_return_after_ordered": "Commandée ou au-delà : aucun retour en arrière, seulement « annulé » avec une note.",
    "reopen_after_ordered": "Cette ligne a été commandée : elle ne se rouvre pas (créer une nouvelle ligne).",
    "invalid_transition": "Transition de statut impossible.",
}
ITEM_NOTE_REQUIRED = "Une note est obligatoire pour cette transition."
ITEM_NEEDS_NAME = "Un libellé est nécessaire."
ITEM_NEEDS_PRODUCT = "Un produit est nécessaire (sauf sur mesure, existant ou frais)."
ITEM_NEEDS_ZONE = "Au moins un placement dans une zone est nécessaire (sauf frais)."
ITEM_NEEDS_SUPPLIER = "Un fournisseur est nécessaire pour chiffrer."
ITEM_NEEDS_PRICE = "Un prix unitaire supérieur à zéro est nécessaire pour chiffrer."
ITEM_NEEDS_ORDER_REF = "Une référence de commande est nécessaire pour passer en « commandé »."
ITEM_CATEGORY_REQUIRED = "Une catégorie est nécessaire sans produit."
ITEM_NAME_REQUIRED = "Un libellé est nécessaire sans produit."
ITEM_FX_REQUIRED = "Un taux de change est nécessaire pour une devise autre que l'euro."
ITEM_FX_EUR_IS_ONE = "En euros, le taux de change vaut 1 000 000 (parité)."
ITEM_EXISTING_IS_FREE = "Une ligne « existant » a un prix nul."
ITEM_CODE_IMMUTABLE = "Le code article ne se modifie qu'en brouillon."
ITEM_CODE_TAKEN = "Ce code article est déjà utilisé dans le projet."
ITEM_READ_ONLY_TERMINAL = "Ligne {status} : plus aucune modification."
ITEM_DELETE_ONLY_DRAFT = "Seul un brouillon sans historique se supprime ; annuler la ligne sinon."
ITEM_REPLACE_ONLY_APPROVED = (
    "Le remplacement n'est possible que depuis « validé » (avant : changer le produit en place)."
)
ITEM_NO_PRODUCT_TO_REFRESH = "Cette ligne n'est pas liée à un produit du catalogue."
PO_STATUS_LABELS: dict[str, str] = {
    "draft": "Brouillon",
    "issued": "Émis",
    "acknowledged": "Accusé de réception",
    "partially_delivered": "Partiellement livré",
    "closed": "Clos",
    "cancelled": "Annulé",
}
PO_SUPPLIER_NOT_FOUND = "Fournisseur introuvable."
PO_SUPPLIER_ARCHIVED = "Le fournisseur est archivé."
PO_ITEM_NOT_IN_PROJECT = "La ligne n'appartient pas à ce projet."
PO_ITEM_WRONG_SUPPLIER = "La ligne {code} n'est pas chez ce fournisseur."
PO_ITEM_WRONG_CURRENCY = "La ligne {code} n'est pas dans la devise du bon de commande ({currency})."
PO_ITEM_NOT_APPROVED = "La ligne {code} doit être validée (statut « validé ») pour être commandée."
PO_ITEM_ON_HOLD = "La ligne {code} est en attente."
PO_ITEM_ALREADY_ORDERED = "La ligne {code} est déjà sur le bon de commande {number}."
PO_ITEM_ALREADY_ON_PO = "La ligne {code} figure déjà sur ce bon de commande."
PO_NOT_DRAFT = (
    "Bon de commande {number} {status} : seules les modifications du brouillon sont possibles."
)
PO_NO_LINES = "Un bon de commande s'émet avec au moins une ligne."
PO_CLOSED = "Bon de commande {number} {status} : plus aucune modification."
PO_TRANSITION = "Bon de commande {number} : passage de {from_status} à {to_status} impossible."
PO_NOTE_REQUIRED = "Une note est obligatoire pour annuler un bon de commande émis."
PO_CANCELLED_NOTE = "BC {number} annulé : {note}"
PO_FILE_ALREADY_ATTACHED = "Ce fichier est déjà joint au bon de commande."
PO_FILE_NOT_ATTACHED = "Ce fichier n'est pas joint au bon de commande."
QUOTE_REFERENCE_TAKEN = "Ce fournisseur a déjà un devis portant cette référence dans le projet."
QUOTE_SUPPLIER_NOT_FOUND = "Fournisseur introuvable."
QUOTE_SUPPLIER_ARCHIVED = "Le fournisseur est archivé."
QUOTE_ITEM_NOT_IN_PROJECT = "La ligne n'appartient pas à ce projet."
QUOTE_ITEM_TERMINAL = "Ligne {status} : un devis ne s'y applique plus."
QUOTE_ITEM_ALREADY_QUOTED = "Ce devis a déjà une ligne pour cet article."
QUOTE_LINE_RETAINED = (
    "Cette ligne de devis est retenue : retenir une autre ligne avant de la supprimer."
)
QUOTE_HAS_RETAINED_LINE = "Ce devis a une ligne retenue : l'écarter plutôt que le supprimer."
QUOTE_DECLINED = "Ce devis est écarté."
QUOTE_RETAIN_AFTER_ORDER = "Ligne {status} : commandée ou au-delà, un devis ne se retient plus."
QUOTE_VALID_BEFORE_QUOTED = "La date de validité doit suivre la date du devis."
QUOTE_FILE_ALREADY_ATTACHED = "Ce fichier est déjà joint au devis."
QUOTE_FILE_NOT_ATTACHED = "Ce fichier n'est pas joint au devis."
QUOTE_RETAINED_NOTE = "Devis {reference} ({supplier}) retenu."
PLACEMENT_ZONE_NOT_IN_PROJECT = "La zone n'appartient pas à ce projet."
PLACEMENT_ZONE_ARCHIVED = "La zone est archivée."
PLACEMENT_ZONE_TAKEN = "La ligne est déjà placée dans cette zone."
PLACEMENT_PIECE_QTY = "Quantité entière attendue pour cette unité (multiple de 1 000 millièmes)."
PLACEMENT_LAST_ONE = (
    "Une ligne garde au moins un placement : modifier celui-ci plutôt que le supprimer."
)
ALERT_BUDGET = "{scope} : prescrit à {pct} % du budget ou plus."
ALERT_ORDER = "{code} : à commander avant le {on}, date dépassée."
BUDGET_DUPLICATE_SCOPE = "Deux budgets pour le même périmètre (projet, zone, catégorie)."
BUDGET_ZONE_NOT_IN_PROJECT = "La zone n'appartient pas à ce projet."
BUDGET_CATEGORY_NOT_FOUND = "Catégorie introuvable."
BUDGET_DOUBLE_COUNT = (
    "Une catégorie et sa sous-catégorie ne peuvent pas avoir chacune un budget pour la même zone."
)
ZONE_CODE_TAKEN = "Une zone de ce projet porte déjà ce code."
ZONE_NOT_EMPTY = "La zone contient des lignes ou un budget : l'archiver plutôt que la supprimer."
ZONE_REORDER_MISMATCH = "La liste doit contenir exactement les zones actives du projet."

PAYLOAD_TOO_LARGE = "Fichier trop volumineux : {mb} Mo au plus."
FILE_TYPE_REFUSED = "Type de fichier refusé : images JPEG, PNG, WebP ou PDF seulement."
FILE_EMPTY = "Fichier vide."
PRODUCT_TTC_NEEDS_VAT = "Un prix TTC exige le taux de TVA à déduire."
PRODUCT_DUPLICATE_REF = (
    "Un produit actif porte déjà cette référence fabricant (n° {id}) ; "
    "ajouter ?force=true pour créer quand même (autre finition)."
)
PRODUCT_DUPLICATE_REF_ARCHIVED = (
    "Un produit archivé porte déjà cette référence fabricant (n° {id}) : le restaurer."
)
PRODUCT_FILE_ALREADY_ATTACHED = "Ce fichier est déjà joint au produit."
PRODUCT_FILE_NOT_ATTACHED = "Ce fichier n'est pas joint au produit."
PRODUCT_FILE_PRIMARY_NOT_IMAGE = "Seule une image peut être la photo principale."
CATEGORY_MUST_BE_ACTIVE = "La catégorie est archivée."
MANUFACTURER_MUST_BE_ACTIVE = "Le fabricant est archivé."
SUPPLIER_MUST_BE_ACTIVE = "Le fournisseur est archivé."

CATEGORY_CODE_REQUIRED = "Une catégorie de niveau 1 porte un code (2 à 4 lettres majuscules)."
CATEGORY_CODE_ON_CHILD = "Une sous-catégorie n'a pas de code : elle hérite de celui de son parent."
CATEGORY_PARENT_NOT_FOUND = "Catégorie parente introuvable."
CATEGORY_PARENT_IS_CHILD = "Deux niveaux seulement : une sous-catégorie ne peut pas avoir d'enfant."
CATEGORY_PARENT_ARCHIVED = "La catégorie parente est archivée."
CATEGORY_DIV_PROTECTED = "La catégorie « Divers » (DIV) ne s'archive pas."
CATEGORY_HAS_ACTIVE_CHILDREN = "Archiver d'abord les sous-catégories actives."
CATEGORY_NAME_TAKEN = "Une catégorie porte déjà ce nom sous le même parent."
CATEGORY_CODE_TAKEN = "Ce code est déjà utilisé."

NOT_FOUND = "{resource} n° {id} introuvable."
VALIDATION = "Données invalides."
DUPLICATE = (
    "Un {resource} actif porte déjà ce nom (n° {id}) ; ajouter ?force=true pour créer quand même."
)
DUPLICATE_ARCHIVED = (
    "Un {resource} archivé porte déjà ce nom (n° {id}) : le restaurer plutôt que le recréer."
)
ALREADY_ARCHIVED = "{resource} n° {id} est déjà archivé."
NOT_ARCHIVED = "{resource} n° {id} n'est pas archivé."
ARCHIVED_READ_ONLY = "{resource} n° {id} est archivé : le restaurer avant de le modifier."
INTEGRITY = "Conflit d'intégrité dans la base ({detail})."
INTERNAL = "Erreur interne : consulter le journal du serveur."
FIELD_REQUIRED = "Ce champ est obligatoire et ne peut pas être vidé."

# Pydantic error `type` → French message; `{…}` placeholders come from the error's `ctx`.
PYDANTIC_MESSAGES: dict[str, str] = {
    "missing": "Champ obligatoire.",
    "string_type": "Texte attendu.",
    "string_too_short": "Au moins {min_length} caractère(s).",
    "string_too_long": "Au plus {max_length} caractères.",
    "string_pattern_mismatch": "Format invalide.",
    "literal_error": "Valeur non autorisée ; attendu : {expected}.",
    "int_parsing": "Entier attendu.",
    "int_type": "Entier attendu.",
    "greater_than_equal": "Doit être supérieur ou égal à {ge}.",
    "less_than_equal": "Doit être inférieur ou égal à {le}.",
    "bool_parsing": "Booléen attendu (true/false).",
    "json_invalid": "JSON illisible.",
    "model_attributes_type": "Objet JSON attendu.",
    "dict_type": "Objet JSON attendu.",
    "list_type": "Liste attendue.",
}


def resource_label(resource: str) -> str:
    label = RESOURCE_LABELS.get(resource, resource)
    return label[:1].upper() + label[1:]
