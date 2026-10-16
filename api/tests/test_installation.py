"""The page grid and the plan's rotation (ADR-0024, `ffe.installation`)."""

from ffe.installation import ARRANGEMENTS, HEIGHT, PER_PAGE, WIDTH, layout, turn


def test_ring_slots_run_clockwise_from_the_top_left_corner() -> None:
    assert layout("ring", 8).slots == [
        (0, 0), (0, 1), (0, 2), (1, 2), (2, 2), (2, 1), (2, 0), (1, 0)
    ]  # fmt: skip


def test_every_arrangement_fills_the_page_and_keeps_the_plan_off_the_articles() -> None:
    for arrangement in ARRANGEMENTS:
        for per_page in PER_PAGE:
            grid = layout(arrangement, per_page)
            assert sum(grid.col_widths) == WIDTH and sum(grid.row_heights) == HEIGHT
            row, col, rows, cols = grid.plan
            under_plan = {(r, c) for r in range(row, row + rows) for c in range(col, col + cols)}
            assert len(grid.slots) == len(set(grid.slots)) == per_page
            assert not under_plan & set(grid.slots), (arrangement, per_page)
    assert layout("right", 12).plan == (0, 0, 4, 1)  # the plan keeps the left of the page
    assert layout("ends", 8).slots[:4] == [(0, 0), (0, 1), (0, 2), (0, 3)]


def test_turning_the_plan_moves_a_point_with_it() -> None:
    assert turn(100, 200, 0) == (100, 200)
    assert turn(100, 200, 90) == (800, 100)  # the top left corner goes to the top right
    assert turn(100, 200, 180) == (900, 800)
    assert turn(100, 200, 270) == (200, 900)
