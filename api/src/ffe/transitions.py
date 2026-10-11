"""Status machine of a project line (DATA_MODEL §5, D7.1, D2.10). Pure table, no I/O.

`check_transition` returns the i18n key of the refusal, or None when the move is allowed; the
service enforces the preconditions of the target status (`required_for`) and writes the journal.
"""

from ffe.money import STATUS_RANK

STATUSES: tuple[str, ...] = (
    "draft",
    "specified",
    "quoted",
    "approved",
    "ordered",
    "delivered",
    "installed",
    "cancelled",
    "replaced",
)
TERMINAL = frozenset({"cancelled", "replaced"})
FREE = frozenset({"draft", "specified", "quoted", "approved"})  # back and forth, with confirmation
FORWARD_ONLY: dict[str, str] = {
    "approved": "ordered",
    "ordered": "delivered",
    "delivered": "installed",
}
# Kinds exempt from the product / price / zone preconditions.
NO_PRODUCT_KINDS = frozenset({"custom", "existing", "fee"})
NO_PRICE_KINDS = frozenset({"existing"})
NO_ZONE_KINDS = frozenset({"fee"})


def check_transition(current: str, target: str, was_ordered: bool) -> str | None:
    """None when allowed; otherwise one of: same_status, replaced_only_by_action,
    no_return_after_ordered, reopen_after_ordered, invalid_transition."""
    if current == target:
        return "same_status"
    if target == "replaced":
        return "replaced_only_by_action"
    if target == "cancelled":
        return None if current not in TERMINAL else "invalid_transition"
    if current == "cancelled":
        if target != "draft":
            return "invalid_transition"
        return "reopen_after_ordered" if was_ordered else None
    if current == "replaced":
        return "invalid_transition"
    if current in FREE and target in FREE:
        return None
    if FORWARD_ONLY.get(current) == target:
        return None
    if (
        STATUS_RANK[current] >= STATUS_RANK["ordered"]
        and STATUS_RANK[target] < STATUS_RANK[current]
    ):
        return "no_return_after_ordered"
    return "invalid_transition"


def required_for(target: str) -> frozenset[str]:
    """Preconditions checked by the service for a target status (cumulative up the ladder)."""
    needs: set[str] = set()
    rank = STATUS_RANK.get(target, -1)
    if rank >= STATUS_RANK["specified"]:
        needs.update({"name", "product", "zone"})
    if rank >= STATUS_RANK["quoted"]:
        needs.update({"supplier", "price"})
    if rank >= STATUS_RANK["ordered"]:
        needs.add("order_ref")
    return frozenset(needs)
