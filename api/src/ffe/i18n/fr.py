"""French messages of the API. Keys are stable identifiers; texts may change freely."""

RESOURCE_LABELS: dict[str, str] = {
    "client": "client",
    "supplier": "fournisseur",
    "professional": "professionnel",
    "category": "type de produit",
    "product": "produit",
    "file": "fichier",
    "project": "projet",
    "location": "localisation",
    "project_item": "article",
    "placement": "implantation",
}

PROFESSIONAL_KIND_LABELS: dict[str, str] = {
    "manufacturer": "Fabricant",
    "distributor": "Distributeur",
    "publisher": "Éditeur",
    "artisan": "Artisan",
}
CONTACT_IMPORT_MISSING_COLUMNS = "Colonnes manquantes dans le fichier : {columns}."
CONTACT_IMPORT_UNKNOWN_KIND = "Ligne {line} ({name}) : prestation inconnue « {kind} »."
CONTACT_IMPORT_EMAIL_NOTE = "E-mail à vérifier : {email}"
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
    "to_quote": "À chiffrer",
    "quoted": "Devisé",
    "to_review": "À revoir",
    "approved": "Validé",
    "deposit": "Acompte",
    "purchased": "Acheté",
    "cancelled": "Annulé",
}
ITEM_KIND_LABELS: dict[str, str] = {"product": "Article", "fee": "Frais"}
ITEM_FAMILY_LABELS: dict[str, str] = {
    "custom": "Pièce sur-mesure",
    "joinery": "Agencement",
    "ose": "OS&E",
    "edition": "Pièce d'édition",
    "gallery": "Pièce de galerie",
    "artwork": "Artwork",
    "textile": "Confection",
}
ITEM_USAGE_LABELS: dict[str, str] = {"indoor": "Intérieur", "outdoor": "Extérieur"}
ITEM_SAME_STATUS = "L'article est déjà dans ce statut."
ITEM_CATEGORY_REQUIRED = "Un type de produit est nécessaire."
ITEM_NAME_REQUIRED = "Une désignation est nécessaire."
ITEM_FEE_NEEDS_SUPPLIER = "Une ligne de frais est rattachée à un fournisseur."
ITEM_FEE_HAS_NO_TYPE = "Une ligne de frais n'a ni type de produit, ni implantation, ni produit."
ITEM_FX_REQUIRED = "Un taux de change est nécessaire pour une devise autre que l'euro."
ITEM_FX_EUR_IS_ONE = "En euros, le taux de change vaut 1 000 000 (parité)."
ITEM_CODE_IMMUTABLE = "Le code FF&E ne se modifie qu'en « à chiffrer »."
ITEM_CODE_TAKEN = "Ce code FF&E est déjà utilisé dans le projet."
ITEM_DELETE_ONLY_NEW = (
    "Seul un article « à chiffrer » sans historique se supprime ; l'annuler sinon."
)
ITEM_PRODUCT_LINKED_NOTE = "lié au produit n° {id} du catalogue"
PLACEMENT_LOCATION_NOT_IN_PROJECT = "La localisation n'appartient pas à ce projet."
PLACEMENT_LOCATION_ARCHIVED = "La localisation est archivée."
PLACEMENT_LOCATION_TAKEN = "L'article est déjà implanté dans cette localisation."
PLACEMENT_LAST_ONE = (
    "Un article garde au moins une implantation : modifier celle-ci plutôt que la supprimer."
)
PLACEMENT_ON_FEE = "Une ligne de frais n'a pas d'implantation."
BUDGET_DUPLICATE_SCOPE = "Deux budgets pour le même périmètre."
BUDGET_LOCATION_NOT_IN_PROJECT = "La localisation n'appartient pas à ce projet."
BUDGET_SUPPLIER_NOT_FOUND = "Fournisseur introuvable."
BUDGET_REFERENCE_MISMATCH = "La référence ne correspond pas au périmètre."
LOCATION_CODE_TAKEN = "Une localisation de ce projet porte déjà ce code."
LOCATION_REORDER_MISMATCH = "La liste doit contenir exactement les localisations actives du projet."

CAPTURE_URL_INVALID = "Adresse attendue en http:// ou https://."
CAPTURE_HTTP_ERROR = "La page répond {status}."
CAPTURE_UNREACHABLE = "Page injoignable ({reason})."
CAPTURE_TOO_LARGE = "Page ou image trop volumineuse (3 Mo au plus)."
CAPTURE_NOT_HTML = "Cette adresse ne renvoie pas une page web."
CAPTURE_NOTHING_FOUND = "Aucune fiche produit lisible sur cette page."
CAPTURE_IMAGE_TYPE = "L'image n'est pas un JPEG, PNG ou WebP."
PAYLOAD_TOO_LARGE = "Fichier trop volumineux : {mb} Mo au plus."
FILE_TYPE_REFUSED = "Type de fichier refusé : images JPEG, PNG, WebP ou PDF seulement."
FILE_EMPTY = "Fichier vide."
PRODUCT_FILE_ALREADY_ATTACHED = "Ce fichier est déjà joint."
PRODUCT_FILE_NOT_ATTACHED = "Ce fichier n'est pas joint."
PRODUCT_FILE_PRIMARY_NOT_IMAGE = "Seule une image peut être la photo principale."
CATEGORY_MUST_BE_ACTIVE = "Le type de produit est archivé."
SUPPLIER_MUST_BE_ACTIVE = "Le fournisseur est archivé."

CATEGORY_NAME_TAKEN = "Un type de produit porte déjà ce nom."
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
