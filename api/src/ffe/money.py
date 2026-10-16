"""Every amount computation of FFE (DATA_MODEL §6). Integers only, rounded to the cent at each step.

Stdlib only; imported by services and tests, never by models. Nothing computed here is stored.
Order of a line: discount → exchange → quantity (D7.3: round per line, then sum).
"""

from collections.abc import Iterable
from dataclasses import dataclass

BP_SCALE = 10_000  # basis points: 10 000 = 100 %
MILLI_SCALE = 1_000  # quantities: 1 000 = one unit
MICRO_SCALE = 1_000_000  # exchange rate: 1 unit of currency = fx_rate_micro / 1 000 000 EUR
EUR_RATE_MICRO = MICRO_SCALE

# Single status ladder (ADR-0013); `cancelled` is out of every total.
STATUS_RANK: dict[str, int] = {
    "to_quote": 0,
    "quoted": 1,
    "to_review": 1,
    "approved": 2,
    "deposit": 3,
    "purchased": 4,
    "cancelled": -1,
}
QUOTED_RANK = STATUS_RANK["quoted"]
APPROVED_RANK = STATUS_RANK["approved"]
WARNING_BP = 9_000  # budget alert: orange at 90 %
OVER_BP = 10_000  # red at 100 %


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
    """Σ qty_milli × location multiplier (multiplier 1 for an unassigned placement)."""
    total = 0
    for qty_milli, multiplier in placements:
        if qty_milli < 0 or multiplier < 1:
            raise ValueError("quantité ≥ 0 et multiplicateur ≥ 1 attendus")
        total += qty_milli * multiplier
    return total


def total_ht_cents(unit_eur_cents: int, qty_milli: int) -> int:
    return div_round(unit_eur_cents * qty_milli, MILLI_SCALE)


def placement_ht_cents(unit_eur_cents: int, qty_milli: int, multiplier: int) -> int:
    """Share of one placement (location totals sum these; may differ by a cent from the line)."""
    return div_round(unit_eur_cents * qty_milli * multiplier, MILLI_SCALE)


def is_counted(status: str) -> bool:
    return status != "cancelled"


def is_quoted_or_later(status: str) -> bool:
    return STATUS_RANK[status] >= QUOTED_RANK


def is_approved_or_later(status: str) -> bool:
    return STATUS_RANK[status] >= APPROVED_RANK


def sum_cents(parts: Iterable[int]) -> int:
    """Sum of amounts already rounded to the cent (each share keeps its own rounding)."""
    return sum(parts)


def share_bp(part: int, whole: int) -> int:
    """Share of `part` in `whole` in basis points (0 when the whole is 0)."""
    if whole <= 0 or part <= 0:
        return 0
    return div_round(part * BP_SCALE, whole)


def alert_level(budget: int | None, specified: int) -> str:
    """`none` / `warning` (≥ 90 %) / `over` (≥ 100 %) of the budget; `none` without a budget."""
    if budget is None or budget <= 0:
        return "none"
    ratio = share_bp(specified, budget)
    if ratio >= OVER_BP:
        return "over"
    if ratio >= WARNING_BP:
        return "warning"
    return "none"


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
) -> LineAmounts:
    """All the amounts of one line; a fee line passes one placement `(1000, 1)`."""
    qty = total_qty_milli(placements)
    net = net_unit_cents(unit_cost_cents, discount_bp)
    eur = net_unit_eur_cents(net, fx_rate_micro)
    return LineAmounts(qty, net, eur, total_ht_cents(eur, qty))


def _check_bp(bp: int) -> None:
    if not 0 <= bp <= BP_SCALE:
        raise ValueError(f"points de base hors de [0, {BP_SCALE}] : {bp}")
