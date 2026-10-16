"""French messages of the API. Keys are stable identifiers; texts may change freely."""

RESOURCE_LABELS: dict[str, str] = {
    "client": "client",
    "supplier": "fournisseur",
    "professional": "professionnel",
    "category": "type de produit",
    "choice": "valeur de liste",
    "file": "fichier",
    "project": "projet",
    "location": "localisation",
    "project_item": "article",
    "placement": "implantation",
    "capture": "capture",
    "listing_profile": "profil de listing",
    "installation_plan": "plan",
    "installation_sheet": "planche d'installation",
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
PROJECT_NO_DIFFUSION = "Aucune diffusion à annuler sur ce projet."
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
CHOICE_UNKNOWN = "Valeur absente de la liste (ou archivée) : la choisir dans Listes."
CHOICE_NAME_TAKEN = "Ce libellé existe déjà dans cette liste."
LISTING_PROFILE_NAME_TAKEN = "Un profil de listing porte déjà ce nom."
# Installation sheets (ADR-0024).
PLAN_FILE_REFUSED = (
    "Le plan doit être une image (JPEG, PNG, WebP) ou un PDF déposé dans l'application."
)
PLAN_PDF_UNREADABLE = "Ce PDF ne peut pas être lu : l'exporter en image ou en PDF standard."
PLAN_IN_USE = (
    "Ce plan est utilisé par {count} planche(s) : leur choisir un autre plan avant de le supprimer."
)
# Journal of an article: the sheet fields changed (event « sheet ») and its files (event « file »).
ITEM_SHEET_FIELD_LABELS: dict[str, str] = {
    "category_id": "type",
    "supplier_id": "fournisseur",
    "name": "désignation",
    "product_name": "description",
    "reference": "référence",
    "family": "famille",
    "usage": "usage",
    "finish": "finitions",
    "dimensions": "dimensions",
    "lead_time": "délai",
    "source_url": "lien",
    "comments": "commentaires",
    "quote_ref": "n° de devis",
    "quote_indice": "indice du devis",
    "quote_url": "lien du devis",
    "item_code": "code",
}
ITEM_SHEET_CHANGED_NOTE = "Fiche modifiée : {fields}."
ITEM_FILE_ADDED_NOTE = "Fichier ajouté : {name}."
ITEM_FILE_CHANGED_NOTE = "Fichier modifié : {name}."
ITEM_FILE_REMOVED_NOTE = "Fichier retiré : {name}."
LOCATION_HAS_PLACEMENTS = (
    "Cette localisation porte {count} implantation(s) : les déplacer ou l'archiver."
)
LOCATION_HAS_SHEETS = "Cette localisation a {count} planche(s) d'installation : les supprimer d'abord (onglet Installation)."
LOCATION_HAS_BUDGET = (
    "Cette localisation a {count} ligne(s) de budget : les retirer d'abord (page Budget)."
)
SHEET_REFERENCE_UNKNOWN = "Introuvable dans ce projet."
SHEET_PLACEMENT_REPEATED = "Un article figure deux fois dans la liste."
SHEET_PLACEMENT_NOT_INSTALLED = (
    "L'article {code} est annulé (ou un frais) : il n'a pas sa place sur une planche."
)
SHEET_PLACEMENT_OUT_OF_ROOM = "L'article {code} n'est pas dans la pièce de cette planche."
# Columns of the listing PDF (ADR-0023), in printing order (`ffe.listing.COLUMNS`).
LISTING_COLUMN_LABELS: dict[str, str] = {
    "photo": "Photo",
    "code": "Code FF&E",
    "type": "Type",
    "name": "Désignation",
    "comments": "Commentaires",
    "link": "Lien",
    "reference": "Référence",
    "supplier": "Fournisseur",
    "contact": "Contact",
    "dimensions": "Dimensions",
    "finish": "Finitions",
    "family": "Famille",
    "usage": "Usage",
    "lead_time": "Délai",
    "quantity": "Qté",
    "amount": "Montant HT €",
    "status": "État",
    "indice": "Ind.",
}
ITEM_SAME_STATUS = "L'article est déjà dans ce statut."
ITEM_CATEGORY_REQUIRED = "Un type de produit est nécessaire."
ITEM_PRODUCT_NAME_REQUIRED = "Un nom est nécessaire."
ITEM_FEE_NEEDS_SUPPLIER = "Une ligne de frais est rattachée à un fournisseur."
ITEM_FEE_HAS_NO_TYPE = "Une ligne de frais n'a ni type de produit, ni implantation, ni produit."
ITEM_FX_REQUIRED = "Un taux de change est nécessaire pour une devise autre que l'euro."
ITEM_FX_EUR_IS_ONE = "En euros, le taux de change vaut 1 000 000 (parité)."
ITEM_CODE_FEE_ONLY = (
    "Le code d'un article suit ses localisations ; seuls les frais se codent à la main."
)
ITEM_CODE_TAKEN = "Ce code FF&E est déjà utilisé dans le projet."
ITEM_DELETE_ONLY_NEW = (
    "Cet article a déjà été diffusé : il ne se supprime plus, l'annuler (seul un article ajouté "
    "depuis la dernière diffusion se supprime)."
)
PLACEMENT_DIFFUSED = (
    "Cette implantation a déjà été diffusée : son code ne change plus (ni déplacement ni retrait) ; "
    "annuler l'article si besoin."
)
ITEM_TYPE_DIFFUSED = "Cet article a déjà été diffusé : son type (et donc son code) ne change plus."
OPTION_ATTACH_DIFFUSED = "Cet article a déjà été diffusé : il ne peut plus devenir une option."
LOCATION_CODE_DIFFUSED = (
    "Cette localisation porte des codes déjà diffusés : son code ne change plus."
)
ITEM_HAS_OPTIONS = "Cet article a des options : les supprimer ou en retenir une d'abord."
OPTION_BASE_INVALID = (
    "Une option se rattache à un article du même projet qui n'est ni un frais, ni une option."
)
OPTION_CANDIDATE_INVALID = (
    "Seul un article de ce projet, sans options, qui n'est ni un frais ni déjà une option, "
    "peut devenir une option."
)
OPTION_NOT_AN_OPTION = "Cet article n'est pas une option."
OPTION_HAS_NO_PLACEMENT = "Une option reprend les implantations de son article de base."
OPTION_ATTACHED_NOTE = "Devenu option {letter}."
OPTION_RETAINED_NOTE = "Option {letter} retenue à la place de l'article de base."
OPTION_TYPE_MISMATCH = "Une option est du même type que son article de base."
OPTION_TYPE_LOCKED = "Une option garde le type de son article de base : changer celui de la base."
OPTION_DETACHED_NOTE = "Option {letter} détachée : article indépendant, non affecté."
# Labels of the budget compilations and of the PDFs (never in a service, CLAUDE.md).
LABEL_PROJECT = "Projet"
LABEL_UNASSIGNED = "Non affecté"
LABEL_NO_TYPE = "Sans type"
PDF_MADE_BY = "Réalisé par {agency}"  # bottom left of the PDFs
INSTALLATION_PDF_TITLE = "Installation {project}"
LABEL_NO_ZONE = "Sans zone"
LABEL_NO_FAMILY = "Sans famille"
LABEL_NO_SUPPLIER = "Sans fournisseur"
LABEL_FEES = "Frais"
FILE_KIND_LABELS = {"image": "Photo", "finish": "Finition", "drawing": "Plan", "other": "Autre"}
OPTION_BASE_CHANGED_NOTE = "Article de base modifié (implantations, codes ou type)."
OPTION_LETTERS_EXHAUSTED = "Plus de lettre libre pour une nouvelle option (Z atteint)."
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
CAPTURE_URL_PRIVATE = "Adresse locale ou privée refusée : seules les pages publiques se lisent."
FOREIGN_ORIGIN = "Requête refusée : elle vient d'une autre page que l'application."
HOST_NOT_LOCAL = "FFE n'écoute que sur la machine locale : 127.0.0.1 ou localhost."
CAPTURE_HTTP_ERROR = "La page répond {status}."
CAPTURE_UNREACHABLE = "Page injoignable ({reason})."
CAPTURE_TOO_LARGE = "Page ou image trop volumineuse (3 Mo au plus)."
CAPTURE_NOT_HTML = "Cette adresse ne renvoie pas une page web."
CAPTURE_NOTHING_FOUND = "Aucune fiche produit lisible sur cette page."
CAPTURE_IMAGE_TYPE = "L'image n'est pas un JPEG, PNG ou WebP."
CAPTURE_HTML_TOO_LARGE = "Page trop volumineuse (5 Mo au plus)."
EXTENSION_TOKEN_INVALID = "Jeton de l'extension absent ou invalide : le copier depuis Réglages."
PAYLOAD_TOO_LARGE = "Fichier trop volumineux : {mb} Mo au plus."
FILE_TYPE_REFUSED = "Type de fichier refusé : images JPEG, PNG, WebP ou PDF seulement."
FILE_EMPTY = "Fichier vide."
FILE_ALREADY_ATTACHED = "Ce fichier est déjà joint."
FILE_NOT_ATTACHED = "Ce fichier n'est pas joint."
FILE_PRIMARY_NOT_IMAGE = "Seule une photo peut être la photo principale."
CATEGORY_MUST_BE_ACTIVE = "Le type de produit est archivé."

CATEGORY_NAME_TAKEN = "Un type de produit porte déjà ce nom."
CATEGORY_CODE_TAKEN = "Ce code est déjà utilisé."
LOGO_NOT_IMAGE = "Le logo doit être une image (JPEG, PNG ou WebP) déposée dans l'application."
CATEGORY_CODE_RESERVED = "Code réservé aux frais (FR-01, FR-02…) : en choisir un autre."

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
INTEGRITY = (
    "Opération refusée par la base (doublon ou référence manquante) : rien n'a été enregistré."
)
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
