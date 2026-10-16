"""Layout of an installation page (ADR-0024): a grid of cells under the head of an A3 landscape
page, the plan spanning a block of it, the articles in the other cells in reading order. Four
arrangements; the PDF and the preview of the page both use it (the API sends it, the screen
never computes it)."""

from dataclasses import dataclass

ARRANGEMENTS = ("ring", "sides", "ends", "right")
PER_PAGE = (8, 12, 16)
# Colours of the product types when a sheet asks for them, muted to the paper and told apart in
# hue and lightness; the types of the project take them in their own order, cycling past eight.
TYPE_COLORS = (
    "#46667f",  # slate blue
    "#b07a3b",  # ochre
    "#6b8a72",  # sage
    "#8b5a7c",  # plum
    "#4f8a8b",  # teal
    "#a5544a",  # brick
    "#6d6a9c",  # indigo
    "#8a8a3a",  # olive
)
NO_TYPE_COLOR = "#8a837b"  # warm grey
INK = "#1c1a17"  # the dots when the sheet is not in colour


def turn(x: int, y: int, rotation: int) -> tuple[int, int]:
    """A point of the plan as stored (thousandths) → the same point on the plan turned
    clockwise by `rotation` degrees (thousandths of the turned image)."""
    if rotation == 90:
        return 1000 - y, x
    if rotation == 180:
        return 1000 - x, 1000 - y
    if rotation == 270:
        return y, 1000 - x
    return x, y


WIDTH, HEIGHT = 1499, 930  # px of the grid under the head and the title (A3 landscape)
SIDE = 240  # width of a column of articles beside the plan
END = 200  # height of a row of articles above or below the plan

# per page → (cells along the top and bottom rows, cells down each side between them)
RING: dict[int, tuple[int, int]] = {8: (3, 1), 12: (4, 2), 16: (5, 3)}
# per page → (columns of articles on each side, rows)
SIDES: dict[int, tuple[int, int]] = {8: (1, 4), 12: (1, 6), 16: (2, 4)}
# per page → (columns, rows) of the block of articles right of the plan
RIGHT: dict[int, tuple[int, int]] = {8: (2, 4), 12: (3, 4), 16: (4, 4)}
RIGHT_SIDE = 200  # narrower columns there: the plan keeps the width


@dataclass(frozen=True)
class Layout:
    col_widths: list[int]  # px, summing to WIDTH
    row_heights: list[int]  # px, summing to HEIGHT
    plan: tuple[int, int, int, int]  # first row, first column, rows, columns
    slots: list[tuple[int, int]]  # (row, column) of each article cell, in reading order


def _split(total: int, parts: int) -> list[int]:
    """`parts` sizes summing to `total`, the remainder on the last one."""
    size = total // parts
    return [size] * (parts - 1) + [total - size * (parts - 1)]


def layout(arrangement: str, per_page: int) -> Layout:
    if arrangement == "ring":  # round the plan, clockwise from the top left corner
        across, down = RING[per_page]
        last_row, last_col = down + 1, across - 1
        slots = (
            [(0, c) for c in range(across)]
            + [(r, last_col) for r in range(1, down + 1)]
            + [(last_row, c) for c in range(last_col, -1, -1)]
            + [(r, 0) for r in range(down, 0, -1)]
        )
        return Layout(
            [SIDE, *_split(WIDTH - 2 * SIDE, across - 2), SIDE],
            [END, *_split(HEIGHT - 2 * END, down), END],
            (1, 1, down, across - 2),
            slots,
        )
    if arrangement == "sides":  # left column(s) top to bottom, then the right ones
        per_side, rows = SIDES[per_page]
        left = [(r, c) for r in range(rows) for c in range(per_side)]
        right = [(r, per_side + 1 + c) for r in range(rows) for c in range(per_side)]
        return Layout(
            [*[SIDE] * per_side, WIDTH - 2 * per_side * SIDE, *[SIDE] * per_side],
            _split(HEIGHT, rows),
            (0, per_side, rows, 1),
            left + right,
        )
    if arrangement == "ends":  # the top row left to right, then the bottom one
        across = per_page // 2
        return Layout(
            _split(WIDTH, across),
            [END, HEIGHT - 2 * END, END],
            (1, 0, 1, across),
            [(0, c) for c in range(across)] + [(2, c) for c in range(across)],
        )
    if arrangement == "right":  # a block right of the plan, row by row
        cols, rows = RIGHT[per_page]
        return Layout(
            [WIDTH - cols * RIGHT_SIDE, *[RIGHT_SIDE] * cols],
            _split(HEIGHT, rows),
            (0, 0, rows, 1),
            [(r, 1 + c) for r in range(rows) for c in range(cols)],
        )
    raise ValueError(arrangement)
