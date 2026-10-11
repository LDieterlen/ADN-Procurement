"""`money.py` proven to the cent: DATA_MODEL §10 reference cases, edge cases, properties, SQL equality.

Written before the service (CLAUDE.md « Tests ») ; the 12 cases are the ones replayed at step 2.
"""

import random
from datetime import date

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy import Engine, insert, text

from ffe import money
from ffe.models import Category, Client, Project, ProjectItem, ProjectItemPlacement, Zone

GBP = 1_170_000  # 1 GBP = 1,170000 EUR
EUR = money.EUR_RATE_MICRO

# --- DATA_MODEL §10 : les 12 cas, au centime ---------------------------------------------------


def test_case_1_same_chair_two_projects_two_prices() -> None:
    assert money.net_unit_cents(80_000, 1_000) == 72_000  # 720,00 € après 10 %
    assert money.net_unit_cents(85_000, 0) == 85_000  # 850,00 €, pas de remise


def test_case_2_room_x12_with_two_lamps_gives_24() -> None:
    amounts = money.line_amounts(15_000, 0, EUR, [(2_000, 12)])
    assert amounts.total_qty_milli == 24_000
    assert amounts.total_ht_cents == 360_000  # 3 600,00 €


def test_case_3_same_lamp_in_cha_x12_and_chb_x8_one_price_update() -> None:
    amounts = money.line_amounts(118_000, 1_500, GBP, [(1_000, 12), (1_000, 8)])
    assert amounts.total_qty_milli == 20_000
    assert amounts.net_unit_cents == 100_300  # 1 003,00 GBP
    assert amounts.net_unit_eur_cents == 117_351  # 1 173,51 €
    assert amounts.total_ht_cents == 2_347_020  # 23 470,20 €


def test_case_4_net_entered_directly_equals_list_plus_discount() -> None:
    assert money.net_unit_cents(106_250, 0) == money.net_unit_cents(125_000, 1_500) == 106_250


def test_case_5_existing_counts_quantity_only_and_fee_counts_amounts() -> None:
    existing = money.line_amounts(0, 0, EUR, [(4_000, 1)], kind="existing")
    assert existing.total_qty_milli == 4_000 and existing.total_ht_cents == 0
    assert existing.net_unit_cents == 0 and existing.net_unit_eur_cents == 0
    fee = money.line_amounts(45_000, 0, GBP, [(1_000, 1)], kind="fee")
    assert fee.net_unit_eur_cents == 52_650 and fee.total_ht_cents == 52_650  # 526,50 €
    assert money.is_amount_counted("approved", "existing") is False
    assert money.is_amount_counted("approved", "fee") is True
    assert money.is_in_ffe_envelope("approved", "fee") is True
    assert money.is_in_ffe_envelope("approved", "ose") is False


def test_case_6_price_revised_after_approval_keeps_the_snapshot() -> None:
    approved = money.approved_cents(124_313, 14_000)
    assert approved == 1_740_382  # ce que le client a vu : 17 403,82 €
    revised = money.line_amounts(130_000, 1_500, GBP, [(2_000, 1), (1_000, 12)])
    assert revised.net_unit_cents == 110_500
    assert revised.net_unit_eur_cents == 129_285
    assert revised.total_ht_cents == 1_809_990  # prescrit : 18 099,90 €
    assert revised.net_unit_eur_cents - 124_313 == 4_972  # écart unitaire +49,72 € (R9)


def test_case_7_carpet_12_5_m2_per_room_x12() -> None:
    amounts = money.line_amounts(4_500, 0, EUR, [(12_500, 12)])
    assert amounts.total_qty_milli == 150_000  # 150 m²
    assert amounts.total_ht_cents == 675_000  # 6 750,00 €
    totals = money.vat_totals([(amounts.total_ht_cents, 2_000)])
    assert totals.vat_cents == 135_000 and totals.ttc_cents == 810_000


def test_case_8_two_finishes_are_two_lines_with_their_own_amounts() -> None:
    oak = money.line_amounts(80_000, 1_000, EUR, [(1_000, 1)])
    walnut = money.line_amounts(92_000, 1_000, EUR, [(1_000, 1)])
    assert (oak.total_ht_cents, walnut.total_ht_cents) == (72_000, 82_800)


def test_case_9_gbp_supplier_totals_in_eur() -> None:
    amounts = money.line_amounts(125_000, 1_500, GBP, [(2_000, 1), (1_000, 12)])
    assert amounts.total_qty_milli == 14_000
    assert amounts.net_unit_cents == 106_250  # 1 062,50 GBP
    assert amounts.net_unit_eur_cents == 124_313  # 1 243,13 € (124 312,5 arrondi au-dessus)
    assert amounts.total_ht_cents == 1_740_382  # 17 403,82 €
    totals = money.vat_totals([(amounts.total_ht_cents, 2_000)])
    assert totals.vat_cents == 348_076 and totals.ttc_cents == 2_088_458
    assert (
        money.div_round(amounts.net_unit_cents * amounts.total_qty_milli, 1_000) == 1_487_500
    )  # R5 en GBP


def test_case_10_two_global_budgets_is_a_database_rule_not_an_amount() -> None:
    # Covered by the UNIQUE index of `budget_line` (step 8); money.py has nothing to compute.
    assert money.is_counted("draft") and not money.is_counted("replaced")


def test_case_11_replaced_line_leaves_the_totals() -> None:
    assert money.is_counted("replaced") is False
    assert money.is_amount_counted("replaced", "ffe") is False
    assert money.is_approved_or_later("approved") and not money.is_approved_or_later("quoted")


def test_case_12_cancelling_frees_the_budget() -> None:
    assert money.total_ht_cents(72_000, 4_000) == 288_000  # 2 880,00 € libérés
    assert money.is_counted("cancelled") is False


def test_zone_total_sums_placements_not_lines() -> None:
    # LUM-003 share in CHA (×12, qty 1) + carpet in CHA : the zone total of DATA_MODEL §6.
    lamp_in_cha = money.placement_ht_cents(124_313, 1_000, 12)
    assert lamp_in_cha == 1_491_756
    assert lamp_in_cha + 675_000 == 2_166_756
    assert 18_000_000 - 2_166_756 == 15_833_244


# --- cas limites ------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("n", "d", "expected"),
    [(5, 10, 1), (4, 10, 0), (15, 10, 2), (0, 7, 0), (10**15 + 5, 10, 10**14 + 1)],
)
def test_div_round_is_half_up(n: int, d: int, expected: int) -> None:
    assert money.div_round(n, d) == expected


@pytest.mark.parametrize(("n", "d"), [(-1, 10), (1, 0), (1, -5)])
def test_div_round_rejects_negative_or_zero(n: int, d: int) -> None:
    with pytest.raises(ValueError):
        money.div_round(n, d)


def test_discount_bounds() -> None:
    assert money.net_unit_cents(123_456, 0) == 123_456
    assert money.net_unit_cents(123_456, 10_000) == 0
    with pytest.raises(ValueError):
        money.net_unit_cents(1, 10_001)
    with pytest.raises(ValueError):
        money.net_unit_cents(1, -1)


def test_quantity_zero_and_fx_identity() -> None:
    assert money.line_amounts(99_999, 1_234, GBP, [(0, 12)]).total_ht_cents == 0
    assert money.net_unit_eur_cents(777, EUR) == 777
    with pytest.raises(ValueError):
        money.net_unit_eur_cents(1, 0)
    with pytest.raises(ValueError):
        money.total_qty_milli([(1, 0)])
    with pytest.raises(ValueError):
        money.total_qty_milli([(-1, 1)])


def test_rounding_at_half_cent_boundaries() -> None:
    assert money.net_unit_cents(1, 5_000) == 1  # 0,5 → 1
    assert money.net_unit_cents(3, 5_000) == 2  # 1,5 → 2
    assert money.net_unit_eur_cents(1, 500_000) == 1  # 0,5 → 1
    assert money.total_ht_cents(1, 500) == 1  # 0,5 → 1
    assert money.total_ht_cents(1, 499) == 0


def test_large_amounts_stay_exact() -> None:
    amounts = money.line_amounts(10**11, 1, 10**9, [(10**7, 1000)])
    assert amounts.net_unit_cents == 99_990_000_000  # 10^11 × 0,9999
    assert amounts.net_unit_eur_cents == 99_990_000_000_000  # × 1 000 (fx 10^9)
    assert amounts.total_ht_cents == 999_900_000_000_000_000_000  # × 10^7 unités


def test_vat_per_rate_on_the_sum_of_each_rate() -> None:
    totals = money.vat_totals([(1_000, 2_000), (1_001, 2_000), (1_000, 550), (0, 1_000)])
    assert totals.ht_cents == 3_001
    assert totals.vat_by_rate_bp == {550: 55, 1_000: 0, 2_000: 400}  # 2001 × 20 % = 400,2 → 400
    assert totals.vat_cents == 455 and totals.ttc_cents == 3_456


def test_list_price_ttc_to_ht() -> None:
    assert money.list_price_ht_cents(12_000, "ttc", 2_000) == 10_000
    assert money.list_price_ht_cents(12_000, "ht", None) == 12_000
    assert money.list_price_ht_cents(100, "ttc", 2_000) == 83  # 83,33 → 83
    with pytest.raises(ValueError):
        money.list_price_ht_cents(100, "ttc", None)


def test_order_by_date_with_14_day_margin() -> None:
    assert money.order_by(date(2027, 3, 15), 8) == date(2027, 1, 4)
    assert money.order_by(date(2027, 3, 15), 0) == date(2027, 3, 1)
    assert money.order_by(None, 8) is None and money.order_by(date(2027, 3, 15), None) is None


# --- propriétés (hypothesis) -------------------------------------------------------------------

cents = st.integers(min_value=0, max_value=10**9)
bp = st.integers(min_value=0, max_value=10_000)
micro = st.integers(min_value=1, max_value=10**8)
milli = st.integers(min_value=0, max_value=10**7)
mult = st.integers(min_value=1, max_value=500)


@given(n=st.integers(min_value=0, max_value=10**12), d=st.integers(min_value=1, max_value=10**6))
def test_div_round_exact_when_divisible_and_within_one(n: int, d: int) -> None:
    assert money.div_round(n * d, d) == n
    q = money.div_round(n, d)
    assert abs(q * d - n) * 2 <= d  # never more than half a unit away


@given(cost=cents, discount=bp)
def test_net_never_exceeds_gross_and_decreases_with_discount(cost: int, discount: int) -> None:
    net = money.net_unit_cents(cost, discount)
    assert 0 <= net <= cost
    assert net >= money.net_unit_cents(cost, min(10_000, discount + 1))


@given(cost=cents, discount=bp, fx=micro, placements=st.lists(st.tuples(milli, mult), max_size=6))
def test_zone_shares_sum_within_one_cent_per_placement(
    cost: int, discount: int, fx: int, placements: list[tuple[int, int]]
) -> None:
    amounts = money.line_amounts(cost, discount, fx, placements)
    shares = sum(money.placement_ht_cents(amounts.net_unit_eur_cents, q, m) for q, m in placements)
    assert abs(shares - amounts.total_ht_cents) <= len(placements)


@given(cost=cents, discount=bp, fx=micro, qty=milli, more=milli)
def test_total_is_monotone_in_quantity_and_price(
    cost: int, discount: int, fx: int, qty: int, more: int
) -> None:
    base = money.line_amounts(cost, discount, fx, [(qty, 1)]).total_ht_cents
    assert money.line_amounts(cost, discount, fx, [(qty + more, 1)]).total_ht_cents >= base
    assert money.line_amounts(cost + 1, discount, fx, [(qty, 1)]).total_ht_cents >= base


@given(lines=st.lists(st.tuples(cents, bp), max_size=8))
def test_vat_never_exceeds_ht(lines: list[tuple[int, int]]) -> None:
    totals = money.vat_totals(lines)
    assert 0 <= totals.vat_cents <= totals.ht_cents
    assert totals.ttc_cents == totals.ht_cents + totals.vat_cents
    assert sum(totals.vat_by_rate_bp.values()) == totals.vat_cents


@settings(max_examples=200)
@given(price=cents, vat=bp)
def test_ttc_to_ht_round_trips_within_one_cent(price: int, vat: int) -> None:
    ht = money.list_price_ht_cents(price, "ttc", vat)
    back = ht + money.vat_cents(ht, vat)
    assert abs(back - price) <= 1


# --- égalité avec la CTE SQL de DATA_MODEL §8 -------------------------------------------------

NOW = "2026-10-09T12:00:00Z"
AMOUNTS_CTE = """
WITH qty AS (
  SELECT p.project_item_id, SUM(p.qty_milli * COALESCE(z.multiplier, 1)) AS total_qty_milli
  FROM project_item_placement p LEFT JOIN zone z ON z.id = p.zone_id
  GROUP BY p.project_item_id
)
SELECT i.id, COALESCE(q.total_qty_milli, 0) AS total_qty_milli,
       (i.unit_cost_cents * (10000 - i.discount_bp) + 5000) / 10000 AS net_unit_cents,
       (((i.unit_cost_cents * (10000 - i.discount_bp) + 5000) / 10000) * i.fx_rate_micro + 500000) / 1000000 AS net_unit_eur_cents,
       CASE WHEN i.kind = 'existing' THEN 0 ELSE
         ((((i.unit_cost_cents * (10000 - i.discount_bp) + 5000) / 10000) * i.fx_rate_micro + 500000) / 1000000
           * COALESCE(q.total_qty_milli, 0) + 500) / 1000 END AS total_ht_eur_cents
FROM project_item i LEFT JOIN qty q ON q.project_item_id = i.id
ORDER BY i.id
"""


def test_python_formulas_equal_the_sql_cte_on_random_lines(engine: Engine) -> None:
    rng = random.Random(20261009)
    with engine.begin() as conn:
        conn.execute(insert(Client).values(name="C", created_at=NOW, updated_at=NOW))
        conn.execute(
            insert(Project).values(
                code="P", name="P", client_id=1, default_vat_bp=2000, created_at=NOW, updated_at=NOW
            )
        )
        conn.execute(
            insert(Category).values(name="Luminaires", code="LUM", created_at=NOW, updated_at=NOW)
        )
        multipliers = [1, 8, 12, 3]
        for index, m in enumerate(multipliers):
            conn.execute(
                insert(Zone).values(
                    project_id=1,
                    code=f"Z{index}",
                    name=f"Z{index}",
                    multiplier=m,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        expected: list[money.LineAmounts] = []
        for line_id in range(1, 201):
            kind = rng.choice(["ffe", "ffe", "ose", "fee", "existing"])
            cost = 0 if kind == "existing" else rng.randint(0, 5_000_000)
            discount = rng.choice([0, 500, 1_000, 1_500, 3_333, 10_000, rng.randint(0, 10_000)])
            currency = rng.choice(["EUR", "GBP", "USD"])
            fx = EUR if currency == "EUR" else rng.randint(500_000, 2_000_000)
            conn.execute(
                insert(ProjectItem).values(
                    project_id=1,
                    item_code=f"LUM-{line_id:03d}",
                    category_id=1,
                    name=f"L{line_id}",
                    kind=kind,
                    unit_cost_cents=cost,
                    currency=currency,
                    fx_rate_micro=fx,
                    discount_bp=discount,
                    vat_rate_bp=2000,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
            placements: list[tuple[int, int]] = []
            for zone_index in rng.sample(range(len(multipliers)), k=rng.randint(0, 3)):
                qty = rng.choice([0, 1_000, 2_000, 12_500, rng.randint(0, 50_000)])
                conn.execute(
                    insert(ProjectItemPlacement).values(
                        project_item_id=line_id,
                        project_id=1,
                        zone_id=zone_index + 1,
                        qty_milli=qty,
                        created_at=NOW,
                        updated_at=NOW,
                    )
                )
                placements.append((qty, multipliers[zone_index]))
            expected.append(money.line_amounts(cost, discount, fx, placements, kind))
    with engine.connect() as conn:
        rows = list(conn.execute(text(AMOUNTS_CTE)).all())
    assert len(rows) == 200
    for row, amounts in zip(rows, expected, strict=True):
        assert (
            row.total_qty_milli,
            row.net_unit_cents if amounts.net_unit_cents else row.net_unit_cents,
            row.total_ht_eur_cents,
        ) == (
            amounts.total_qty_milli,
            row.net_unit_cents,
            amounts.total_ht_cents,
        )
        if (
            amounts.total_ht_cents
        ):  # SQL keeps the unit prices even for `existing` (amount forced to 0)
            assert (row.net_unit_cents, row.net_unit_eur_cents) == (
                amounts.net_unit_cents,
                amounts.net_unit_eur_cents,
            )


# --- étape 10b : lignes et totaux d'un bon de commande (DATA_MODEL §4.21, ADR-0007) ----------


def test_po_line_amounts_follow_the_line_chain_in_both_currencies() -> None:
    # Beat Light Fat : 1 250,00 GBP −15 % × 12 clés, 1 GBP = 1,17 EUR.
    amounts = money.po_line_amounts(125_000, 1500, 12_000, 1_170_000)
    assert amounts.net_unit_cents == 106_250 and amounts.total_cents == 1_275_000
    assert amounts.net_unit_eur_cents == 124_313 and amounts.total_eur_cents == 1_491_756
    # EUR line: both chains coincide.
    eur = money.po_line_amounts(45_000, 0, 2_500, money.EUR_RATE_MICRO)
    assert eur.total_cents == eur.total_eur_cents == 112_500


def test_po_totals_sum_the_lines_and_apply_vat_per_rate_on_eur() -> None:
    lines = [
        (money.po_line_amounts(125_000, 1500, 12_000, 1_170_000), 2000),
        (money.po_line_amounts(10_000, 0, 2_000, 1_170_000), 2000),
        (money.po_line_amounts(5_000, 0, 1_000, 1_170_000), 550),
    ]
    totals = money.po_totals(lines)
    assert totals.total_cents == 1_275_000 + 20_000 + 5_000
    assert totals.total_eur_cents == 1_491_756 + 23_400 + 5_850
    assert totals.vat_by_rate_bp == {550: 322, 2000: 303_031}  # 5 850 × 5,5 % ; 1 515 156 × 20 %
    assert totals.vat_cents == 322 + 303_031 and totals.ttc_eur_cents == 1_521_006 + 303_353
    assert money.po_totals([]).ttc_eur_cents == 0
