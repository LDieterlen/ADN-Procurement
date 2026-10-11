"""Status machine (DATA_MODEL §5, D7.1, D2.10): every allowed and refused move, by name."""

import pytest

from ffe.transitions import STATUSES, check_transition, required_for


@pytest.mark.parametrize(
    ("current", "target"),
    [
        ("draft", "specified"),
        ("specified", "quoted"),
        ("quoted", "approved"),
        ("approved", "draft"),  # free back and forth below `ordered`, with confirmation
        ("approved", "quoted"),
        ("draft", "approved"),
        ("approved", "ordered"),
        ("ordered", "delivered"),
        ("delivered", "installed"),
        ("draft", "cancelled"),
        ("installed", "cancelled"),
        ("cancelled", "draft"),
    ],
)
def test_allowed_moves(current: str, target: str) -> None:
    assert check_transition(current, target, was_ordered=False) is None


@pytest.mark.parametrize(
    ("current", "target", "reason"),
    [
        ("draft", "draft", "same_status"),
        ("ordered", "draft", "no_return_after_ordered"),
        ("ordered", "approved", "no_return_after_ordered"),
        ("delivered", "ordered", "no_return_after_ordered"),
        ("installed", "delivered", "no_return_after_ordered"),
        ("quoted", "ordered", "invalid_transition"),  # must pass through approved
        ("draft", "delivered", "invalid_transition"),
        ("approved", "installed", "invalid_transition"),
        ("ordered", "installed", "invalid_transition"),  # strict ladder
        ("draft", "replaced", "replaced_only_by_action"),
        ("replaced", "draft", "invalid_transition"),
        ("cancelled", "approved", "invalid_transition"),
        ("cancelled", "cancelled", "same_status"),
        ("replaced", "cancelled", "invalid_transition"),
    ],
)
def test_refused_moves(current: str, target: str, reason: str) -> None:
    assert check_transition(current, target, was_ordered=False) == reason


def test_reopening_a_cancelled_line_is_refused_once_it_was_ordered() -> None:
    assert check_transition("cancelled", "draft", was_ordered=False) is None
    assert check_transition("cancelled", "draft", was_ordered=True) == "reopen_after_ordered"


def test_every_pair_has_a_verdict() -> None:
    for current in STATUSES:
        for target in STATUSES:
            verdict = check_transition(current, target, was_ordered=False)
            assert verdict is None or verdict in {
                "same_status",
                "replaced_only_by_action",
                "no_return_after_ordered",
                "reopen_after_ordered",
                "invalid_transition",
            }


def test_preconditions_are_cumulative() -> None:
    assert required_for("draft") == frozenset()
    assert required_for("specified") == {"name", "product", "zone"}
    assert required_for("quoted") == {"name", "product", "zone", "supplier", "price"}
    assert required_for("approved") == required_for("quoted")
    assert required_for("ordered") == required_for("quoted") | {"order_ref"}
    assert required_for("cancelled") == frozenset()
