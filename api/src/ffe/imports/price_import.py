"""Reads an xlsx/CSV price list, applies a per-supplier mapping, and plans the changes (ADR-0011).

Pure functions: no session here except for the matcher inputs built by the service.
"""

import csv
import io
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any, Literal

from openpyxl import load_workbook

from ffe.services.base import normalize_key

FIELDS: tuple[str, ...] = (
    "name",
    "supplierRef",
    "manufacturerRef",
    "gtin",
    "listPrice",
    "leadTimeWeeks",
    "finish",
    "manufacturerName",
)
# Header words that suggest a field when no mapping is saved yet (lowercase, normalized).
GUESSES: dict[str, tuple[str, ...]] = {
    "name": ("designation", "libelle", "nom", "description", "name", "produit", "article"),
    "supplierRef": ("ref", "reference", "code", "sku", "ref fournisseur", "article no"),
    "manufacturerRef": ("ref fabricant", "ref fab", "manufacturer ref", "mfr", "modele"),
    "gtin": ("gtin", "ean", "ean13", "upc", "code barre"),
    "listPrice": ("prix", "price", "tarif", "pu", "prix ht", "prix ttc"),
    "leadTimeWeeks": ("delai", "lead time", "semaines", "weeks"),
    "finish": ("finition", "finish", "coloris"),
    "manufacturerName": ("marque", "fabricant", "brand", "manufacturer"),
}
Action = Literal["create", "update", "unchanged", "skip"]


@dataclass
class Sheet:
    columns: list[str]
    rows: list[dict[str, str]]


@dataclass
class Mapping:
    columns: dict[str, str]  # field → column header
    tax_mode: str
    vat_bp: int | None
    default_category_id: int | None
    currency: str

    def to_json(self) -> dict[str, Any]:
        return {
            "columns": self.columns,
            "taxMode": self.tax_mode,
            "vatBp": self.vat_bp,
            "defaultCategoryId": self.default_category_id,
            "currency": self.currency,
        }


@dataclass
class ExistingProduct:
    id: int
    name: str
    manufacturer_id: int | None
    manufacturer_ref: str | None
    gtin: str | None
    supplier_ref: str | None
    list_price_cents: int | None
    list_price_currency: str
    list_price_tax_mode: str
    archived: bool


@dataclass
class PlanRow:
    row_index: int  # 1-based data row (header excluded)
    action: Action
    reason: str | None
    matched_by: str | None
    product_id: int | None
    name: str | None
    supplier_ref: str | None
    manufacturer_ref: str | None
    manufacturer_name: str | None
    gtin: str | None
    old_price_cents: int | None
    new_price_cents: int | None
    lead_time_weeks: int | None = None
    finish: str | None = None
    errors: list[str] = field(default_factory=list[str])


# --- reading ---------------------------------------------------------------------------------


def read_sheet(data: bytes, filename: str) -> Sheet:
    if filename.lower().endswith((".xlsx", ".xlsm")) or data[:2] == b"PK":
        return _read_xlsx(data)
    return _read_csv(data)


def _cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _read_xlsx(data: bytes) -> Sheet:
    workbook = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    sheet = workbook.worksheets[0]
    rows_iter = sheet.iter_rows(values_only=True)
    header = next(rows_iter, None)
    if header is None:
        return Sheet([], [])
    columns = [_cell_text(h) or f"Colonne {i + 1}" for i, h in enumerate(header)]
    rows: list[dict[str, str]] = []
    for raw in rows_iter:
        values = [_cell_text(v) for v in raw]
        if not any(values):
            continue
        rows.append({columns[i]: values[i] if i < len(values) else "" for i in range(len(columns))})
    workbook.close()
    return Sheet(columns, rows)


def _read_csv(data: bytes) -> Sheet:
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("latin-1")
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t|")
    except csv.Error:
        dialect = csv.excel
        dialect.delimiter = ";" if sample.count(";") >= sample.count(",") else ","
    reader = csv.reader(io.StringIO(text), dialect)
    header = next(reader, None)
    if header is None:
        return Sheet([], [])
    columns = [h.strip() or f"Colonne {i + 1}" for i, h in enumerate(header)]
    rows: list[dict[str, str]] = []
    for raw in reader:
        values = [v.strip() for v in raw]
        if not any(values):
            continue
        rows.append({columns[i]: values[i] if i < len(values) else "" for i in range(len(columns))})
    return Sheet(columns, rows)


# --- parsing ---------------------------------------------------------------------------------


def parse_price_cents(text: str) -> int | None:
    """« 1 250,50 », « 1,250.50 », « €1250 » → 125050 ; None when unreadable. No float anywhere."""
    cleaned = "".join(ch for ch in text if ch.isdigit() or ch in ",.-")
    if not cleaned or cleaned in ("-", ".", ","):
        return None
    if "," in cleaned and "." in cleaned:
        decimal_sep = "," if cleaned.rfind(",") > cleaned.rfind(".") else "."
        thousands = "." if decimal_sep == "," else ","
        cleaned = cleaned.replace(thousands, "").replace(decimal_sep, ".")
    elif "," in cleaned or "." in cleaned:
        sep = "," if "," in cleaned else "."
        head, _, tail = cleaned.rpartition(sep)
        thousands = cleaned.count(sep) > 1 or (len(tail) == 3 and head.strip("-") not in ("", "0"))
        cleaned = cleaned.replace(sep, "") if thousands else head.replace(sep, "") + "." + tail
    try:
        amount = Decimal(cleaned)
    except InvalidOperation:
        return None
    if amount < 0:
        return None
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def parse_weeks(text: str) -> int | None:
    digits = "".join(ch for ch in text if ch.isdigit())
    return int(digits) if digits else None


def guess_mapping(columns: list[str]) -> dict[str, str]:
    """Best-effort field → column from header words; the user confirms it in the preview."""
    found: dict[str, str] = {}
    normalized = {column: normalize_key(column) for column in columns}
    for field_name in FIELDS:
        for column, key in normalized.items():
            if column in found.values():
                continue
            if any(
                key == normalize_key(w) or key.startswith(normalize_key(w))
                for w in GUESSES[field_name]
            ):
                found[field_name] = column
                break
    return found


# --- planning --------------------------------------------------------------------------------


def _value(row: dict[str, str], mapping: Mapping, field_name: str) -> str | None:
    column = mapping.columns.get(field_name)
    if not column:
        return None
    text = row.get(column, "").strip()
    return text or None


def plan_rows(
    sheet: Sheet,
    mapping: Mapping,
    existing: list[ExistingProduct],
    manufacturers_by_key: dict[str, int],
) -> list[PlanRow]:
    """gtin → (manufacturer, manufacturer_ref) → supplier_ref (DF4.1); one plan row per data row."""
    by_gtin = {p.gtin: p for p in existing if p.gtin}
    by_mfr = {
        (p.manufacturer_id, normalize_key(p.manufacturer_ref)): p
        for p in existing
        if p.manufacturer_id and p.manufacturer_ref
    }
    by_supplier_ref = {normalize_key(p.supplier_ref): p for p in existing if p.supplier_ref}
    seen_keys: set[str] = set()
    plan: list[PlanRow] = []
    for index, row in enumerate(sheet.rows, start=1):
        name = _value(row, mapping, "name")
        supplier_ref = _value(row, mapping, "supplierRef")
        manufacturer_ref = _value(row, mapping, "manufacturerRef")
        manufacturer_name = _value(row, mapping, "manufacturerName")
        gtin_text = _value(row, mapping, "gtin")
        gtin = "".join(ch for ch in gtin_text if ch.isdigit()) if gtin_text else None
        if gtin and not 8 <= len(gtin) <= 14:
            gtin = None
        price_text = _value(row, mapping, "listPrice")
        price = parse_price_cents(price_text) if price_text else None
        weeks_text = _value(row, mapping, "leadTimeWeeks")
        weeks = parse_weeks(weeks_text) if weeks_text else None
        finish = _value(row, mapping, "finish")
        manufacturer_id = (
            manufacturers_by_key.get(normalize_key(manufacturer_name))
            if manufacturer_name
            else None
        )

        match: ExistingProduct | None = None
        matched_by: str | None = None
        if gtin and gtin in by_gtin:
            match, matched_by = by_gtin[gtin], "gtin"
        elif (
            manufacturer_id
            and manufacturer_ref
            and (manufacturer_id, normalize_key(manufacturer_ref)) in by_mfr
        ):
            match, matched_by = (
                by_mfr[(manufacturer_id, normalize_key(manufacturer_ref))],
                "manufacturerRef",
            )
        elif supplier_ref and normalize_key(supplier_ref) in by_supplier_ref:
            match, matched_by = by_supplier_ref[normalize_key(supplier_ref)], "supplierRef"

        key = (
            gtin
            or (
                f"m:{manufacturer_id}:{normalize_key(manufacturer_ref)}"
                if manufacturer_id and manufacturer_ref
                else None
            )
            or (f"s:{normalize_key(supplier_ref)}" if supplier_ref else None)
        )
        errors: list[str] = []
        if key and key in seen_keys:
            errors.append("ligne en double dans le fichier")
        if key:
            seen_keys.add(key)
        if price_text and price is None:
            errors.append(f"prix illisible : « {price_text} »")
        if match is None and not name:
            errors.append("désignation absente : impossible de créer")
        if match is None and mapping.default_category_id is None:
            errors.append("catégorie par défaut absente : impossible de créer")
        if match is None and not key:
            errors.append("aucune référence (réf. fournisseur, réf. fabricant ou GTIN)")
        if match is not None and match.archived:
            errors.append("produit archivé : à restaurer avant")

        if errors:
            action: Action = "skip"
        elif match is None:
            action = "create"
        elif price is None:
            action = "unchanged"
        elif (
            match.list_price_cents == price
            and match.list_price_currency == mapping.currency
            and match.list_price_tax_mode == mapping.tax_mode
        ):
            action = "unchanged"
        else:
            action = "update"
        plan.append(
            PlanRow(
                row_index=index,
                action=action,
                reason="; ".join(errors) if errors else None,
                matched_by=matched_by,
                product_id=match.id if match else None,
                name=name or (match.name if match else None),
                supplier_ref=supplier_ref,
                manufacturer_ref=manufacturer_ref,
                manufacturer_name=manufacturer_name,
                gtin=gtin,
                old_price_cents=match.list_price_cents if match else None,
                new_price_cents=price,
                lead_time_weeks=weeks,
                finish=finish,
                errors=errors,
            )
        )
    return plan
