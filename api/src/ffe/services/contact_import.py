"""One-shot import of the agency's contacts file (ADR-0015).

`;`-separated CSV with the header `NOM;PRESTATION;SAVOIR-FAIRE;Contact 1;TELEPHONE;PORTABLE;MAIL;
Contact 2;Telephone 2;Mail 2`, plus the optional columns `SITE WEB` and `NOTES`. « Fournisseur » rows become suppliers, every other prestation a
professional. Idempotent: a name already in the table is skipped; identical rows are read once;
the same name under two prestations gets the prestation appended to the second one.
"""

import csv
import io
import re
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import DuplicateError
from ffe.i18n import fr
from ffe.schemas.professional import ProfessionalCreate
from ffe.schemas.supplier import SupplierCreate
from ffe.services.base import normalize_key
from ffe.services.choice import labels as choice_labels
from ffe.services.professional import create_professional
from ffe.services.supplier import create_supplier

COLUMNS = {
    "name": "NOM",
    "kind": "PRESTATION",
    "specialty": "SAVOIR-FAIRE",
    "contact_name": "CONTACT 1",
    "phone": "TELEPHONE",
    "mobile": "PORTABLE",
    "email": "MAIL",
    "contact2_name": "CONTACT 2",
    "contact2_phone": "TELEPHONE 2",
    "contact2_email": "MAIL 2",
}
OPTIONAL_COLUMNS = {"website": "SITE WEB", "notes": "NOTES"}
SUPPLIER_KIND = "fournisseur"
PROFESSIONAL_KINDS = {
    "fabricant": "manufacturer",
    "distributeur": "distributor",
    "editeur": "publisher",
    "artisan": "artisan",
}
EMPTY_MARKERS = {"", "nc", "-"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ContactImportError(ValueError):
    """The file cannot be read as a contacts list (missing column, unknown prestation)."""


@dataclass
class ContactRow:
    line: int
    name: str
    kind: str  # "supplier" or a professional kind
    fields: dict[str, str | None]
    notes: str | None = None


@dataclass
class ContactImportResult:
    suppliers_created: int = 0
    professionals_created: int = 0
    skipped_existing: int = 0
    skipped_duplicate_rows: int = 0
    renamed: list[tuple[str, str]] = field(default_factory=list[tuple[str, str]])
    emails_to_check: list[str] = field(default_factory=list[str])


def decode_contacts(raw: bytes) -> str:
    """UTF-8 (with or without BOM) first; Excel on Windows writes cp1252."""
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("cp1252")


def _clean(value: str | None) -> str | None:
    text = re.sub(r"\s+", " ", (value or "").strip())
    return None if text.lower() in EMPTY_MARKERS else text


def _clean_email(value: str | None) -> tuple[str | None, str | None]:
    """Returns (valid email or None, raw text to keep in notes when invalid)."""
    text = _clean(value)
    if text is None:
        return None, None
    text = text.strip("<>;, ")
    return (text, None) if EMAIL_RE.match(text) else (None, text)


def parse_contacts(text: str, prestations: dict[str, str] | None = None) -> list[ContactRow]:
    """`prestations`: folded label → code of the « prestation » list (defaults: the seed values)."""
    known = prestations if prestations is not None else PROFESSIONAL_KINDS
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    headers = {(h or "").strip().upper(): h for h in reader.fieldnames or []}
    missing = [label for label in COLUMNS.values() if label not in headers]
    if missing:
        raise ContactImportError(
            fr.CONTACT_IMPORT_MISSING_COLUMNS.format(columns=", ".join(missing))
        )
    rows: list[ContactRow] = []
    seen: set[tuple[str, str]] = set()
    for line, record in enumerate(reader, start=2):

        def get(key: str) -> str | None:
            return record.get(headers[COLUMNS[key]])

        name = _clean(get("name"))
        if name is None:
            continue
        kind_label = normalize_key(_clean(get("kind")) or "")
        if kind_label == SUPPLIER_KIND:
            kind = "supplier"
        elif kind_label in known:
            kind = known[kind_label]
        else:
            raise ContactImportError(
                fr.CONTACT_IMPORT_UNKNOWN_KIND.format(line=line, name=name, kind=get("kind"))
            )
        key = (normalize_key(name), kind)
        if key in seen:
            continue
        seen.add(key)
        email, bad_email = _clean_email(get("email"))
        email2, bad_email2 = _clean_email(get("contact2_email"))
        notes = [fr.CONTACT_IMPORT_EMAIL_NOTE.format(email=e) for e in (bad_email, bad_email2) if e]
        optional = {
            key: _clean(record.get(headers[label]))
            for key, label in OPTIONAL_COLUMNS.items()
            if label in headers
        }
        if note := optional.get("notes"):
            notes.insert(0, note)
        fields: dict[str, str | None] = {
            "specialty": _clean(get("specialty")),
            "contact_name": _clean(get("contact_name")),
            "phone": _clean(get("phone")),
            "mobile": _clean(get("mobile")),
            "email": email,
            "contact2_name": _clean(get("contact2_name")),
            "contact2_phone": _clean(get("contact2_phone")),
            "contact2_email": email2,
            "website": optional.get("website"),
        }
        rows.append(ContactRow(line, name, kind, fields, "\n".join(notes) or None))
    return rows


def import_contacts(session: Session, text: str, clock: Clock) -> ContactImportResult:
    with session.begin():
        listed = choice_labels(session, "prestation")
    prestations = {
        **PROFESSIONAL_KINDS,
        **{normalize_key(label): code for code, label in listed.items()},
    }
    rows = parse_contacts(text, prestations)
    result = ContactImportResult()
    result.skipped_duplicate_rows = _count_data_lines(text) - len(rows)
    names_in_file: dict[str, str] = {}  # normalized name → kind of the first row
    for row in rows:
        name = row.name
        first_kind = names_in_file.setdefault(normalize_key(name), row.kind)
        if first_kind != row.kind:
            label = (
                fr.resource_label("supplier")
                if row.kind == "supplier"
                else listed.get(row.kind, row.kind)
            )
            name = f"{row.name} ({label})"
            result.renamed.append((row.name, name))
        prefix = fr.CONTACT_IMPORT_EMAIL_NOTE.format(email="")
        result.emails_to_check.extend(
            line.removeprefix(prefix)
            for line in (row.notes or "").splitlines()
            if line.startswith(prefix)
        )
        try:
            if row.kind == "supplier":
                payload = {"name": name, "notes": row.notes, **row.fields}
                create_supplier(session, SupplierCreate.model_validate(payload), clock)
                result.suppliers_created += 1
            else:
                payload = {"name": name, "kind": row.kind, "notes": row.notes, **row.fields}
                create_professional(session, ProfessionalCreate.model_validate(payload), clock)
                result.professionals_created += 1
        except DuplicateError:
            result.skipped_existing += 1
    return result


def _count_data_lines(text: str) -> int:
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    return sum(1 for record in reader if _clean(next(iter(record.values()), None)) is not None)
