"""Columns of the listing PDF (ADR-0023): a fixed catalogue, printed in this order; a listing
profile keeps a subset of these keys."""

from typing import Literal, get_args

ListingColumn = Literal[
    "photo",
    "code",
    "type",
    "name",
    "comments",
    "link",
    "reference",
    "supplier",
    "contact",
    "dimensions",
    "finish",
    "family",
    "usage",
    "lead_time",
    "quantity",
    "amount",
    "status",
    "indice",
]
COLUMNS: tuple[str, ...] = get_args(ListingColumn)


# How the columns are printed (2026-10-16): some share a cell, the first key of a group heads it,
# the others are smaller lines under it (a link prints « Lien »), so that a full listing fits the
# width of a landscape page. A group is printed when one of its keys is in the profile.
GROUPS: tuple[tuple[str, ...], ...] = (
    ("photo",),
    ("code",),
    ("type",),
    ("name", "comments", "link"),
    ("reference",),
    ("supplier", "contact", "lead_time"),
    ("dimensions", "finish"),
    ("family", "usage"),
    ("quantity",),
    ("amount",),
    ("status",),
    ("indice",),
)
# Details printed under their group's main value, never in its heading when that value is shown.
DETAIL_KEYS = frozenset({"comments", "link", "contact", "lead_time"})


def printed_groups(columns: list[str], labels: dict[str, str]) -> list[dict[str, object]]:
    """The cells of a listing row for these columns: {key, label, show}."""
    wanted = set(columns)
    groups: list[dict[str, object]] = []
    for group in GROUPS:
        shown = [k for k in group if k in wanted]
        if not shown:
            continue
        heading = [k for k in shown if k not in DETAIL_KEYS] or shown
        groups.append(
            {"key": group[0], "label": " · ".join(labels[k] for k in heading), "show": set(shown)}
        )
    return groups


def in_catalogue_order(columns: list[str]) -> list[str]:
    """Each column once, in the printing order of the catalogue."""
    wanted = set(columns)
    return [c for c in COLUMNS if c in wanted]
