"""`money.py` proven to the cent (DATA_MODEL §6): reference cases, edge cases, properties.

Written before the service (CLAUDE.md « Tests »).
"""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from ffe import money

GBP = 1_170_000  # 1 GBP = 1,170000 EUR
EUR = money.EUR_RATE_MICRO


def test_discount_then_exchange_then_quantity_rounded_at_each_step() -> None:
    amounts = money.line_amounts(125_000, 1_500, GBP, [(2_000, 1), (1_000, 12)])
    assert amounts.total_qty_milli == 14_000
    assert amounts.net_unit_cents == 106_250  # 1 062,50 GBP
    assert amounts.net_unit_eur_cents == 124_313  # 1 243,125 → 1 243,13 €
    assert amounts.total_ht_cents == 1_740_382  # 17 403,82 €


def test_room_x12_with_two_lamps_gives_24() -> None:
    amounts = money.line_amounts(15_000, 0, EUR, [(2_000, 12)])
    assert amounts.total_qty_milli == 24_000
    assert amounts.total_ht_cents == 360_000  # 3 600,00 €


def test_fractional_quantity_per_room() -> None:
    amounts = money.line_amounts(4_500, 0, EUR, [(12_500, 12)])  # 12,5 m² × 12
    assert amounts.total_qty_milli == 150_000
    assert amounts.total_ht_cents == 675_000  # 6 750,00 €


def test_placement_shares_can_differ_from_the_line_total_by_a_cent() -> None:
    unit = 124_313
    assert money.placement_ht_cents(unit, 2_000, 1) == 248_626
    assert money.placement_ht_cents(unit, 1_000, 12) == 1_491_756
    assert 248_626 + 1_491_756 == money.total_ht_cents(unit, 14_000)


def test_full_discount_gives_zero() -> None:
    assert money.net_unit_cents(99_999, 10_000) == 0


def test_div_round_is_half_up() -> None:
    assert money.div_round(5, 10) == 1
    assert money.div_round(4, 10) == 0
    assert money.div_round(15, 10) == 2
    with pytest.raises(ValueError):
        money.div_round(-1, 10)
    with pytest.raises(ValueError):
        money.div_round(1, 0)


def test_basis_points_out_of_range_are_refused() -> None:
    with pytest.raises(ValueError):
        money.net_unit_cents(100, 10_001)
    with pytest.raises(ValueError):
        money.net_unit_cents(100, -1)


def test_negative_quantity_or_zero_multiplier_refused() -> None:
    with pytest.raises(ValueError):
        money.total_qty_milli([(-1, 1)])
    with pytest.raises(ValueError):
        money.total_qty_milli([(1_000, 0)])


def test_status_ladder_and_counting() -> None:
    assert money.is_counted("to_quote") and not money.is_counted("cancelled")
    assert not money.is_quoted_or_later("to_quote")
    assert money.is_quoted_or_later("quoted") and money.is_quoted_or_later("to_review")
    assert not money.is_approved_or_later("to_review")
    assert money.is_approved_or_later("approved")
    assert money.is_approved_or_later("deposit") and money.is_approved_or_later("purchased")
    assert not money.is_quoted_or_later("cancelled")


def test_share_bp_and_alert_levels() -> None:
    assert money.share_bp(0, 100) == 0 and money.share_bp(50, 0) == 0
    assert money.share_bp(1, 3) == 3_333
    assert money.alert_level(None, 100) == "none"
    assert money.alert_level(1_000, 899) == "none"
    assert money.alert_level(1_000, 900) == "warning"
    assert money.alert_level(1_000, 1_000) == "over"


@settings(max_examples=200)
@given(
    cost=st.integers(0, 10**9),
    discount=st.integers(0, 10_000),
    fx=st.integers(1, 5_000_000),
    qty=st.integers(0, 10**6),
    multiplier=st.integers(1, 1_000),
)
def test_amounts_are_non_negative_integers_and_monotonic_in_quantity(
    cost: int, discount: int, fx: int, qty: int, multiplier: int
) -> None:
    a = money.line_amounts(cost, discount, fx, [(qty, multiplier)])
    b = money.line_amounts(cost, discount, fx, [(qty + 1_000, multiplier)])
    assert a.total_ht_cents >= 0 and isinstance(a.total_ht_cents, int)
    assert b.total_ht_cents >= a.total_ht_cents
    assert a.net_unit_cents <= cost


def test_sum_cents_adds_shares_already_rounded() -> None:
    assert money.sum_cents([]) == 0
    assert money.sum_cents([33_33, 33_33, 33_34]) == 100_00  # three thirds of 100,00 €
