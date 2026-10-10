"""French messages of the API. Keys are stable identifiers; texts may change freely."""

RESOURCE_LABELS: dict[str, str] = {
    "client": "client",
    "supplier": "fournisseur",
    "manufacturer": "fabricant",
    "category": "catégorie",
    "product": "produit",
    "file": "fichier",
}

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
