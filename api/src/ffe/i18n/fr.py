"""French messages of the API. Keys are stable identifiers; texts may change freely."""

RESOURCE_LABELS: dict[str, str] = {
    "client": "client",
}

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
