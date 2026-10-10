"""`services/client`: normalisation key and service-level rules, without HTTP."""

import pytest
from sqlalchemy.orm import Session

from conftest import make_client
from ffe.deps import Clock
from ffe.errors import DuplicateError, NotFoundError
from ffe.schemas.client import ClientUpdate
from ffe.services.base import normalize_key
from ffe.services.client import get_client, list_clients, update_client


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Hôtel Élysée", "hotel elysee"),
        ("  Famille   Martin ", "famille martin"),
        ("ÇA", "ca"),
        ("Straße", "strasse"),
    ],
)
def test_normalize_key_ignores_accents_case_and_spacing(a: str, b: str) -> None:
    assert normalize_key(a) == normalize_key(b)


def test_normalize_key_keeps_distinct_names_apart() -> None:
    assert normalize_key("Martin") != normalize_key("Martine")


def test_factory_creates_through_the_service(session: Session, clock: Clock) -> None:
    created = make_client(session, clock, name="Alpha")
    assert created.id is not None and created.created_at == "2026-10-09T12:00:00Z"
    assert get_client(session, created.id).name == "Alpha"
    assert [c.name for c in list_clients(session)] == ["Alpha"]


def test_update_refuses_a_duplicate_name(session: Session, clock: Clock) -> None:
    make_client(session, clock, name="Alpha")
    beta = make_client(session, clock, name="Beta")
    with pytest.raises(DuplicateError):
        update_client(session, beta.id, ClientUpdate(name="alpha"), clock)


def test_get_unknown_raises_not_found(session: Session) -> None:
    with pytest.raises(NotFoundError, match="n° 9 introuvable"):
        get_client(session, 9)
