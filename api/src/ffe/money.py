"""Every amount computation of FFE (DATA_MODEL §6). Integers only, rounded to the cent at each step.

Stdlib only; imported by services and tests, never by models. Nothing computed here is stored.
Order of a line: discount → exchange → quantity → VAT (D7.3: round per line, then sum).
"""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, timedelta

BP_SCALE = 10_000  # basis points: 10 000 = 100 %
MILLI_SCALE = 1_000  # quantities: 1 000 = one unit
MICRO_SCALE = 1_000_000  # exchange rate: 1 unit of currency = fx_rate_micro / 1 000 000 EUR
EUR_RATE_MICRO = MICRO_SCALE

NOT_COUNTED_STATUSES = frozenset({"cancelled", "replaced"})
STATUS_RANK: dict[str, int] = {
    "draft": 0,
    "specified": 1,
    "quoted": 2,
    "approved": 3,
    "ordered": 4,
    "delivered": 5,
    "installed": 6,
    "cancelled": -1,
    "replaced": -1,
}
APPROVED_RANK = STATUS_RANK["approved"]
ORDER_ALERT_MARGIN_DAYS = 14  # D7.5


def div_round(n: int, d: int) -> int:
    """Half-up integer division for n ≥ 0, d > 0 (the single rounding rule of the project)."""
    if n < 0 or d <= 0:
        raise ValueError(f"div_round attend n ≥ 0 et d > 0, reçu {n}, {d}")
    return (n + d // 2) // d


def net_unit_cents(unit_cost_cents: int, discount_bp: int) -> int:
    """Unit price after the supplier discount, in the line's currency."""
    _check_bp(discount_bp)
    return div_round(unit_cost_cents * (BP_SCALE - discount_bp), BP_SCALE)


def net_unit_eur_cents(net_cents: int, fx_rate_micro: int) -> int:
    if fx_rate_micro <= 0:
        raise ValueError("fx_rate_micro doit être > 0")
    return div_round(net_cents * fx_rate_micro, MICRO_SCALE)


def total_qty_milli(placements: Iterable[tuple[int, int]]) -> int:
    """Σ qty_milli × zone multiplier (multiplier 1 for an unassigned placement)."""
    total = 0
    for qty_milli, multiplier in placements:
        if qty_milli < 0 or multiplier < 1:
            raise ValueError("quantité ≥ 0 et multiplicateur ≥ 1 attendus")
        total += qty_milli * multiplier
    return total


def total_ht_cents(unit_eur_cents: int, qty_milli: int) -> int:
    return div_round(unit_eur_cents * qty_milli, MILLI_SCALE)


def vat_cents(ht_cents: int, vat_rate_bp: int) -> int:
    _check_bp(vat_rate_bp)
    return div_round(ht_cents * vat_rate_bp, BP_SCALE)


def list_price_ht_cents(list_price_cents: int, tax_mode: str, vat_bp: int | None) -> int:
    """Catalogue price brought back to HT when it was observed TTC (DATA_MODEL §6, line creation)."""
    if tax_mode == "ht":
        return list_price_cents
    if vat_bp is None:
        raise ValueError("un prix TTC exige le taux de TVA")
    _check_bp(vat_bp)
    return div_round(list_price_cents * BP_SCALE, BP_SCALE + vat_bp)


def is_counted(status: str) -> bool:
    return status not in NOT_COUNTED_STATUSES


def is_amount_counted(status: str, kind: str) -> bool:
    return is_counted(status) and kind != "existing"


def is_in_ffe_envelope(status: str, kind: str) -> bool:
    """Budget and « Prescrit » scope (DATA_MODEL §5): counted amounts, OS&E aside."""
    return is_amount_counted(status, kind) and kind != "ose"


def is_approved_or_later(status: str) -> bool:
    return STATUS_RANK[status] >= APPROVED_RANK


@dataclass(frozen=True)
class LineAmounts:
    total_qty_milli: int
    net_unit_cents: int
    net_unit_eur_cents: int
    total_ht_cents: int


def line_amounts(
    unit_cost_cents: int,
    discount_bp: int,
    fx_rate_micro: int,
    placements: Iterable[tuple[int, int]],
    kind: str = "ffe",
) -> LineAmounts:
    """All the amounts of one line; `existing` keeps its quantity but every amount is 0."""
    qty = total_qty_milli(placements)
    if kind == "existing":
        return LineAmounts(qty, 0, 0, 0)
    net = net_unit_cents(unit_cost_cents, discount_bp)
    eur = net_unit_eur_cents(net, fx_rate_micro)
    return LineAmounts(qty, net, eur, total_ht_cents(eur, qty))


def placement_ht_cents(unit_eur_cents: int, qty_milli: int, multiplier: int) -> int:
    """Share of one placement (zone totals sum these; may differ by a cent from the line total)."""
    return div_round(unit_eur_cents * qty_milli * multiplier, MILLI_SCALE)


def approved_cents(approved_unit_net_cents: int, approved_total_qty_milli: int) -> int:
    return div_round(approved_unit_net_cents * approved_total_qty_milli, MILLI_SCALE)


@dataclass(frozen=True)
class VatTotals:
    ht_cents: int
    vat_by_rate_bp: dict[int, int]
    vat_cents: int
    ttc_cents: int


def vat_totals(lines: Iterable[tuple[int, int]]) -> VatTotals:
    """VAT per rate on the HT sum of each rate (DATA_MODEL §6), then TTC."""
    ht_by_rate: dict[int, int] = {}
    for ht, rate_bp in lines:
        ht_by_rate[rate_bp] = ht_by_rate.get(rate_bp, 0) + ht
    vat_by_rate = {rate: vat_cents(ht, rate) for rate, ht in sorted(ht_by_rate.items())}
    ht_total = sum(ht_by_rate.values())
    vat_total = sum(vat_by_rate.values())
    return VatTotals(ht_total, vat_by_rate, vat_total, ht_total + vat_total)


def order_by(required_on_site: date | None, lead_time_weeks: int | None) -> date | None:
    """Latest order date: on-site date − lead time − 14-day margin (D7.5); None when unknown."""
    if required_on_site is None or lead_time_weeks is None:
        return None
    return required_on_site - timedelta(days=lead_time_weeks * 7 + ORDER_ALERT_MARGIN_DAYS)


def _check_bp(bp: int) -> None:
    if not 0 <= bp <= BP_SCALE:
        raise ValueError(f"points de base hors de [0, {BP_SCALE}] : {bp}")
