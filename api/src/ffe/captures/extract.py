"""Generic product extraction from an HTML page (ADR-0014): schema.org/Product in JSON-LD first,
then OpenGraph / `product:*` meta tags, then the page title. Stdlib only, no site-specific rule.
Prices are kept as the page states them (usually public, taxes included): the user corrects."""

import json
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from html import unescape
from typing import Any, cast

Source = str  # "json-ld" | "opengraph" | "title"

_LD = re.compile(
    r"<script[^>]*type\s*=\s*[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", re.S | re.I
)
_META = re.compile(r"<meta\s+[^>]*>", re.I)
_ATTR = re.compile(r"([\w:.-]+)\s*=\s*(\"([^\"]*)\"|'([^']*)')", re.S)
_TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.S | re.I)
_TAGS = re.compile(r"<[^>]+>")


@dataclass(frozen=True)
class Extracted:
    name: str | None
    brand: str | None
    reference: str | None
    image_url: str | None
    price_cents: int | None
    currency: str | None
    description: str | None
    source: Source


def _dict(value: Any) -> dict[str, Any] | None:
    return cast(dict[str, Any], value) if isinstance(value, dict) else None


def _list(value: Any) -> list[Any] | None:
    return cast(list[Any], value) if isinstance(value, list) else None


def _text(value: Any) -> str | None:
    if isinstance(value, str):
        text = unescape(_TAGS.sub("", value)).strip()
        return re.sub(r"\s+", " ", text) or None
    if (record := _dict(value)) is not None:
        return _text(record.get("name") or record.get("@value"))
    if (items := _list(value)) is not None and items:
        return _text(items[0])
    if isinstance(value, int | float) and not isinstance(value, bool):
        return str(value)
    return None


def price_cents(value: Any) -> int | None:
    """« 399.00 », « 1 250,50 », 399 → cents; None when unreadable or negative."""
    if isinstance(value, bool) or value is None:
        return None
    text = str(value).strip().replace(" ", "").replace("\xa0", "").replace(" ", "")
    if text.count(",") == 1 and text.count(".") == 0:
        text = text.replace(",", ".")
    elif text.count(",") >= 1 and text.count(".") == 1:
        text = text.replace(",", "")
    if text.startswith("-"):
        return None
    text = re.sub(r"[^0-9.]", "", text)
    try:
        amount = Decimal(text)
    except InvalidOperation:
        return None
    return int((amount * 100).quantize(Decimal(1)))


def _products(node: Any) -> list[dict[str, Any]]:
    """Every `Product` object in a JSON-LD document (top level, `@graph`, lists)."""
    found: list[dict[str, Any]] = []
    if (record := _dict(node)) is not None:
        kind: Any = record.get("@type")
        kinds: list[Any] = _list(kind) or [kind]
        if "Product" in kinds:
            found.append(record)
        for child in _list(record.get("@graph")) or []:
            found.extend(_products(child))
    elif (items := _list(node)) is not None:
        for child in items:
            found.extend(_products(child))
    return found


def _offer(product: dict[str, Any]) -> tuple[int | None, str | None]:
    offers: Any = product.get("offers")
    offer_items = _list(offers)
    offer = _dict(offer_items[0] if offer_items else offers)
    if offer is None:
        return None, None
    price: Any = offer.get("price")
    specification = _dict(offer.get("priceSpecification"))
    if price is None and specification is not None:
        price = specification.get("price")
    if price is None:
        price = offer.get("lowPrice")
    currency = _text(offer.get("priceCurrency"))
    return price_cents(price), currency.upper()[:3] if currency else None


def _from_json_ld(html: str) -> Extracted | None:
    for block in _LD.findall(html):
        try:
            document = json.loads(block.strip(), strict=False)  # raw newlines in strings happen
        except ValueError:
            continue
        for product in _products(document):
            price, currency = _offer(product)
            return Extracted(
                name=_text(product.get("name")),
                brand=_text(product.get("brand")),
                reference=_text(
                    product.get("sku") or product.get("mpn") or product.get("productID")
                ),
                image_url=_text(product.get("image")),
                price_cents=price,
                currency=currency,
                description=_text(product.get("description")),
                source="json-ld",
            )
    return None


def _meta(html: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for tag in _META.findall(html):
        attrs = {
            m.group(1).lower(): unescape(m.group(3) or m.group(4) or "")
            for m in _ATTR.finditer(tag)
        }
        key = attrs.get("property") or attrs.get("name")
        if key and "content" in attrs and key.lower() not in found:
            found[key.lower()] = attrs["content"]
    return found


def extract(html: str) -> Extracted:
    found = _from_json_ld(html)
    meta = _meta(html)
    og = Extracted(
        name=_text(meta.get("og:title")),
        brand=_text(meta.get("product:brand")),
        reference=_text(meta.get("product:retailer_item_id")),
        image_url=_text(meta.get("og:image")),
        price_cents=price_cents(meta.get("product:price:amount")),
        currency=(meta.get("product:price:currency") or "").upper()[:3] or None,
        description=_text(meta.get("og:description") or meta.get("description")),
        source="opengraph" if meta.get("og:title") else "title",
    )
    if found is None:
        if og.name is None:
            title = _TITLE.search(html)
            og = Extracted(
                _text(title.group(1)) if title else None,
                None,
                None,
                og.image_url,
                None,
                None,
                og.description,
                "title",
            )
        return og
    # JSON-LD first, OpenGraph fills the holes.
    return Extracted(
        name=found.name or og.name,
        brand=found.brand or og.brand,
        reference=found.reference or og.reference,
        image_url=found.image_url or og.image_url,
        price_cents=found.price_cents if found.price_cents is not None else og.price_cents,
        currency=found.currency or og.currency,
        description=found.description or og.description,
        source="json-ld",
    )
