"""Generic product extraction from an HTML page (ADR-0014): schema.org/Product in JSON-LD first,
then the product object of an analytics tag, then OpenGraph / `product:*` meta tags, then the page
title. Stdlib only, no site-specific rule.
Prices are kept as the page states them (usually public, taxes included): the user corrects.
Also guessed from the page, always to be checked (2026-10-13): the product type (keywords in the
name and the JSON-LD breadcrumb), the dimensions and the delivery lead time (patterns in the text)."""

import json
import re
import unicodedata
from dataclasses import dataclass, replace
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
# An attribute holding a JSON object: data-x="{&quot;name&quot;:…}" or data-x='{"name":…}'.
_DATA_JSON = re.compile(r"[\w:.-]+\s*=\s*(?:\"(\{&(?:quot|#34);[^\"]*\})\"|'(\{\"[^']*\})')")


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
    type_code: str | None = None  # guessed from name and breadcrumb (seed codes), or None
    dimensions: str | None = None  # « H 78 × L 56.10 × P 60.50 cm » as found in the page
    lead_time: str | None = None  # « 3 semaines » as found in the page
    finish: str | None = None  # schema.org `color` (and `material`), « Chêne naturel »
    image_urls: tuple[str, ...] = ()  # every product photo of the page, first = `image_url`


def _dict(value: Any) -> dict[str, Any] | None:
    return cast(dict[str, Any], value) if isinstance(value, dict) else None


def _list(value: Any) -> list[Any] | None:
    return cast(list[Any], value) if isinstance(value, list) else None


def _text(value: Any) -> str | None:
    if isinstance(value, str):
        text = unescape(_TAGS.sub(" ", value)).strip()  # a tag is a break, never a glue
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
    currency = _text(offer.get("priceCurrency"))
    # `priceSpecification` is one object, or a list during a sale: the current price plus the
    # struck-through one (`priceType` StrikethroughPrice), which is never the price to keep.
    specifications = _list(offer.get("priceSpecification")) or [offer.get("priceSpecification")]
    current = [
        s
        for s in (_dict(x) for x in specifications)
        if s is not None and "strikethrough" not in str(s.get("priceType") or "").lower()
    ]
    if price is None and current:
        price = current[0].get("price")
        currency = currency or _text(current[0].get("priceCurrency"))
    if price is None:
        price = offer.get("lowPrice")
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
                finish=_finish(product),
            )
    return None


def _finish(product: dict[str, Any]) -> str | None:
    """`color`, then `material`, joined: « Chêne naturel, chêne massif »."""
    parts = [p for p in (_text(product.get("color")), _text(product.get("material"))) if p]
    return ", ".join(dict.fromkeys(parts)) or None


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


def _from_tracking(html: str, under: Extracted, page_url: str) -> Extracted | None:
    """The product object of an analytics tag (`data-…='{"name":…,"id":…,"price":…}'`, the usual
    e-commerce tracking shape), for pages whose JSON-LD only comes with JavaScript. Kept only when
    it is the page's own product (its id in the page address, or its name the last breadcrumb),
    never a neighbour's. Its price is often tax-free where the page shows it tax-included."""
    crumbs = breadcrumb_names(html)
    own_name = _fold(crumbs[-1]) if crumbs else None
    for match in _DATA_JSON.finditer(html):
        try:
            record = _dict(json.loads(unescape(match.group(1) or match.group(2)), strict=False))
        except ValueError:
            continue
        if record is None or "price" not in record:
            continue
        name = _text(record.get("name") or record.get("item_name"))
        reference = _text(record.get("id") or record.get("item_id"))
        in_url = reference is not None and len(reference) >= 4 and reference.lower() in page_url
        if name is None or not (in_url or _fold(name) == own_name):
            continue
        currency = _text(record.get("currency") or record.get("currencyCode"))
        return Extracted(
            name=name,
            brand=_text(record.get("brand") or record.get("item_brand")),
            reference=reference,
            image_url=None,
            price_cents=price_cents(record.get("price")),
            currency=currency.upper()[:3] if currency else None,
            description=None,
            source=under.source,
        )
    return None


def _over(top: Extracted, under: Extracted) -> Extracted:
    """`top` first, `under` fills the holes."""
    return Extracted(
        name=top.name or under.name,
        brand=top.brand or under.brand,
        reference=top.reference or under.reference,
        image_url=top.image_url or under.image_url,
        price_cents=top.price_cents if top.price_cents is not None else under.price_cents,
        currency=top.currency or under.currency,
        description=top.description or under.description,
        source=top.source,
        finish=top.finish or under.finish,
    )


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
        finish=_text(meta.get("product:color")),
    )
    if found is None and og.name is None:
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
    # JSON-LD first, then the tracking tag, OpenGraph fills the holes.
    merged = og
    if (tracked := _from_tracking(html, og, (meta.get("og:url") or "").lower())) is not None:
        merged = _over(tracked, merged)
    if found is not None:
        merged = _over(found, merged)
    merged = replace(merged, image_urls=image_urls(html, merged.image_url))
    if merged.image_urls and merged.image_url is None:
        merged = replace(merged, image_url=merged.image_urls[0])
    return _with_guesses(merged, html, og.description)


MAX_IMAGES = 12


def _image_url(value: Any) -> str | None:
    """A JSON-LD image: a URL string or an `ImageObject` (`contentUrl`, `url`)."""
    if isinstance(value, str):
        return value.strip() or None
    if (record := _dict(value)) is not None:
        return _image_url(record.get("contentUrl") or record.get("url"))
    return None


def image_urls(html: str, first: str | None = None) -> tuple[str, ...]:
    """Every photo of the product: the JSON-LD `image` list(s), then `og:image`; `first` leads,
    duplicates dropped, at most MAX_IMAGES."""
    found: list[str] = [first] if first else []
    for block in _LD.findall(html):
        try:
            document = json.loads(block.strip(), strict=False)
        except ValueError:
            continue
        for product in _products(document):
            images: Any = product.get("image")
            for value in _list(images) or [images]:
                if (url := _image_url(value)) is not None:
                    found.append(url)
    if (og := _meta(html).get("og:image")) is not None:
        found.append(og.strip())
    unique = [u for u in dict.fromkeys(found) if u.startswith(("http://", "https://"))]
    return tuple(unique[:MAX_IMAGES])


def _with_guesses(base: Extracted, html: str, meta_description: str | None) -> Extracted:
    breadcrumbs = breadcrumb_names(html)
    text = visible_text(html)
    return replace(
        base,
        type_code=guess_type(base.name, breadcrumbs),
        dimensions=find_dimensions(base.description, text),
        lead_time=find_lead_time(base.description, text, meta_description),
    )


# --- guesses: type, dimensions, lead time (generic patterns, French pages first) ---------------

# Keyword (lowercase, accent-free) → seed type code; longer keywords are tried first.
TYPE_KEYWORDS: dict[str, str] = {
    "canape": "AS",
    "fauteuil": "AS",
    "chaise": "AS",
    "banquette": "AS",
    "bergere": "AS",
    "pouf": "AS",
    "meridienne": "AS",
    "chauffeuse": "AS",
    "banc": "AS",
    "sofa": "AS",
    "table": "TAB",
    "bureau": "TAB",
    "console": "TAB",
    "gueridon": "TAB",
    "tabouret": "TBR",
    "lit": "LIT",
    "tete de lit": "LIT",
    "sommier": "LIT",
    "matelas": "LIT",
    "tapis": "TAP",
    "moquette": "TAP",
    "rideau": "RID",
    "voilage": "RID",
    "store": "RID",
    "linge": "LIN",
    "drap": "LIN",
    "housse de couette": "LIN",
    "taie": "LIN",
    "serviette": "LIN",
    "plaid": "LIN",
    "coussin": "LIN",
    "spot": "LUA",
    "encastre": "LUA",
    "rail": "LUA",
    "reglette": "LUA",
    "downlight": "LUA",
    "lampe": "LUD",
    "suspension": "LUD",
    "applique": "LUD",
    "lampadaire": "LUD",
    "luminaire": "LUD",
    "lustre": "LUD",
    "plafonnier": "LUD",
    "lanterne": "LUD",
    "miroir": "MIR",
    "vase": "DEC",
    "bougeoir": "DEC",
    "objet deco": "DEC",
    "decoration": "DEC",
    "sculpture": "DEC",
    "cadre": "DEC",
    "horloge": "DEC",
    "tableau": "ART",
    "oeuvre": "ART",
    "photographie": "ART",
    "lithographie": "ART",
    "cintre": "ACC",
    "corbeille": "ACC",
    "porte serviette": "ACC",
    "patere": "ACC",
    "porte manteau": "ACC",
    "valet": "ACC",
    "poignee": "QUI",
    "serrure": "QUI",
    "charniere": "QUI",
    "bouton de porte": "QUI",
    "robinet": "SAN",
    "mitigeur": "SAN",
    "vasque": "SAN",
    "lavabo": "SAN",
    "baignoire": "SAN",
    "douche": "SAN",
    "wc": "SAN",
    "lave mains": "SAN",
    "papier peint": "REV",
    "revetement": "REV",
    "carrelage": "REV",
    "parquet": "REV",
    "tissu mural": "REV",
    "signaletique": "SIG",
    "plaque de porte": "SIG",
    "numero de chambre": "SIG",
    "bibliotheque": "AGE",
    "dressing": "AGE",
    "placard": "AGE",
    "etagere": "AGE",
    "meuble": "AGE",
    "buffet": "AGE",
    "commode": "AGE",
    "chevet": "AGE",
    "armoire": "AGE",
    "minibar": "EQU",
    "coffre fort": "EQU",
    "seche cheveux": "EQU",
    "televiseur": "EQU",
    "bouilloire": "EQU",
    "machine a cafe": "EQU",
}
_BREADCRUMB_SKIP = {"accueil", "home", "tous les produits", "produits"}
_KEYWORDS_BY_LENGTH = sorted(TYPE_KEYWORDS, key=len, reverse=True)


def _fold(text: str) -> str:
    """Lowercase, accents and punctuation removed, single spaces."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", ascii_text).strip()


def guess_type(name: str | None, breadcrumbs: tuple[str, ...] = ()) -> str | None:
    """First keyword found in the name, else in the breadcrumb (deepest level first)."""
    for text in [name or "", *reversed(breadcrumbs)]:
        folded = f" {_fold(text)} "
        for keyword in _KEYWORDS_BY_LENGTH:
            if f" {keyword} " in folded or f" {keyword}s " in folded:
                return TYPE_KEYWORDS[keyword]
    return None


def breadcrumb_names(html: str) -> tuple[str, ...]:
    """Names of the JSON-LD `BreadcrumbList`, « Accueil » left out, () when absent."""
    for block in _LD.findall(html):
        try:
            document = json.loads(block.strip(), strict=False)
        except ValueError:
            continue
        candidates: list[Any] = [document]
        if (record := _dict(document)) is not None:
            candidates.extend(_list(record.get("@graph")) or [])
        elif (items := _list(document)) is not None:
            candidates.extend(items)
        for node in candidates:
            crumbs = _dict(node)
            if crumbs is None or crumbs.get("@type") != "BreadcrumbList":
                continue
            names: list[str] = []
            for element in _list(crumbs.get("itemListElement")) or []:
                item = _dict(element)
                if item is None:
                    continue
                label = _text(item.get("item")) if "item" in item else _text(item)
                if label and _fold(label) not in _BREADCRUMB_SKIP:
                    names.append(label)
            if names:
                return tuple(names)
    return ()


_SCRIPT = re.compile(r"<(script|style|noscript)[^>]*>.*?</\1>", re.S | re.I)
_NUM = r"\d+(?:[.,]\d+)?"
_UNIT = r"(?:cm|mm|m)"
_END = (
    r"(?-i:(?![a-z]))"  # « 80 cmUtiles » (glued by the site) still ends on « cm », even under re.I
)
_DIM_LETTERED = re.compile(
    rf"(?:(?:H|L|P|l|D|Ø)\s?{_NUM}\s?{_UNIT}?\s?[×x*]\s?){{1,3}}(?:H|L|P|l|D|Ø)\s?{_NUM}\s?{_UNIT}{_END}",
    re.I,
)
_DIM_ROUND = re.compile(
    rf"(?:Ø|Diam(?:ètre|etre|\.)?)\s?:?\s?{_NUM}\s?{_UNIT}{_END}(?:\s?[×x]\s?H\s?{_NUM}\s?{_UNIT}{_END})?",
    re.I,
)
_DIM_PLAIN = re.compile(
    rf"\b{_NUM}\s?{_UNIT}?\s?[×x]\s?{_NUM}(?:\s?{_UNIT}?\s?[×x]\s?{_NUM})?\s?{_UNIT}{_END}"
)
_DIM_WORDS = re.compile(
    rf"(Hauteur|Largeur|Profondeur|Longueur|Diam[èe]tre)\s?:?\s?({_NUM})\s?({_UNIT}){_END}", re.I
)
_WORD_LETTER = {"hauteur": "H", "largeur": "L", "profondeur": "P", "longueur": "L", "diametre": "Ø"}
_LEAD = re.compile(
    r"(?:livraison|livr[ée]e?s?|exp[ée]di[ée]e?s?|exp[ée]dition|disponible|d[ée]lai(?: de livraison)?)"
    r"\s*(?::|sous|en|dans|d'environ|de|estim[ée]e? (?:à|a))?\s*"
    r"((?:\d+\s?(?:à|-|/)\s?)?\d+\s?(?:jours?|semaines?|mois|h)\b(?:\s?ouvr[ée]s?)?)",
    re.I,
)


def visible_text(html: str) -> str:
    """The page without scripts, styles and tags, whitespace folded."""
    text = _SCRIPT.sub(" ", html)
    text = unescape(_TAGS.sub(" ", text))
    return re.sub(r"\s+", " ", text)


def _tidy_dimensions(found: str) -> str:
    found = re.sub(r"\s*[×x*]\s*", " × ", found.strip())
    found = re.sub(r"(\d)\s?(cm|mm|m)\b", r"\1 \2", found)
    return re.sub(r"\s+", " ", found)


# A match right after one of these words is a part, a package or a detail, not the product.
_DIM_SUB = re.compile(
    r"(assise|dossier|accoudoir|manchot|colis|carton|emballage|pied|plateau|abat-jour|"
    r"int[ée]rieur|ouvert|déplié|deplie|couchage|matelas|caisson|tiroir|niche)\D{0,20}$",
    re.I,
)
_DIM_INTRO = re.compile(r"dimensions?(?!\s+(?:et poids|des? colis|colis))", re.I)
_DIM_WINDOW = 120  # characters: how far apart lettered word dimensions may be to belong together


def _word_groups(text: str) -> list[tuple[int, str]]:
    """Runs of « Largeur : 143 cm • Hauteur : 76 cm … » close to each other (≥ 2, ≤ 4 figures),
    each folded to one line; « Largeur » is « l » when a « Longueur » sits in the same run."""
    words = [
        (m.start(), _fold(m.group(1)), m.group(2), m.group(3))
        for m in _DIM_WORDS.finditer(text)
        if not _DIM_SUB.search(text[max(0, m.start() - 40) : m.start()])
    ]
    groups: list[tuple[int, str]] = []
    run: list[tuple[int, str, str, str]] = []
    for word in [*words, None]:
        close_enough = word is not None and (not run or word[0] - run[-1][0] <= _DIM_WINDOW)
        if close_enough and word is not None:
            repeated = next((i for i, w in enumerate(run) if w[1] == word[1]), None)
            if repeated is None and len(run) < 4:
                run.append(word)
                continue
            # « hauteur 25 cm » of a title then « Hauteur : 28 cm » of the block: the block starts
            # after the earlier figure of the same kind (emitted first if it made a run).
            if len(run) >= 2:
                groups.append(_fold_run(run))
            run = [*run[(repeated + 1 if repeated is not None else 1) :], word]
            continue
        if len(run) >= 2:
            groups.append(_fold_run(run))
        run = [word] if word is not None else []
    return groups


def _fold_run(run: list[tuple[int, str, str, str]]) -> tuple[int, str]:
    has_length = any(w[1] == "longueur" for w in run)
    parts: list[str] = []
    for _, name, value, unit in run:
        letter = "l" if (name == "largeur" and has_length) else _WORD_LETTER[name]
        part = f"{letter} {value} {unit}"
        if part not in parts:
            parts.append(part)
    return run[0][0], " × ".join(parts)


def find_dimensions(*texts: str | None) -> str | None:
    """The product's overall dimensions, or None when nothing is clear (better empty than wrong):
    the earliest mention in the text wins — « Longueur : 258 cm, Hauteur : 84 cm, Profondeur :
    222 cm » (folded to « L 258 cm × H 84 cm × P 222 cm »), « H 78 × L 56.10 × P 60.50 cm »,
    « 120 x 60 x 75 cm », « Ø 36 cm » — a mention introduced by « assise », « colis »,
    « manchot »… is skipped, and a single figure alone gives nothing."""
    # (0 when introduced by « Dimensions », else 1 ; rank of the text ; position ; -length): the
    # first wins, so a « Dimensions : … » line of the page beats a loose figure of the description.
    candidates: list[tuple[int, int, int, int, str]] = []
    for rank, text in enumerate(texts):
        if not text:
            continue

        def add(position: int, found: str, page: str = text, rank: int = rank) -> None:
            intro = 0 if _DIM_INTRO.search(page[max(0, position - 60) : position]) else 1
            candidates.append((intro, rank, position, -len(found), found))

        for pattern in (_DIM_LETTERED, _DIM_ROUND, _DIM_PLAIN):
            for match in pattern.finditer(text):
                if _DIM_SUB.search(text[max(0, match.start() - 40) : match.start()]):
                    continue
                add(match.start(), _tidy_dimensions(match.group(0)))
                break
        for position, folded in _word_groups(text):
            add(position, folded)
    return min(candidates)[4] if candidates else None


def find_lead_time(*texts: str | None) -> str | None:
    """« Livraison sous 3 semaines », « Expédié en 2 à 4 jours ouvrés » → the duration."""
    for text in texts:
        if not text:
            continue
        match = _LEAD.search(text)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip()
    return None
