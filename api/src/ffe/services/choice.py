"""`choice` service: editable value lists (family, usage, prestation). The code is generated
from the name at creation (slug, unique in its list) and never changes; the name does."""

import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.models import Choice
from ffe.schemas.choice import ChoiceCreate, ChoiceUpdate
from ffe.services.base import normalize_key, stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import get_or_404
from ffe.services.common import unarchive as common_unarchive

RESOURCE = "choice"


def list_choices(
    session: Session, list_name: str | None = None, include_archived: bool = False
) -> list[Choice]:
    query = select(Choice).order_by(Choice.list, Choice.sort_order, Choice.id)
    if list_name:
        query = query.where(Choice.list == list_name)
    if not include_archived:
        query = query.where(Choice.archived_at.is_(None))
    return list(session.scalars(query))


def labels(session: Session, list_name: str) -> dict[str, str]:
    """code → name of a list, archived values included (old data keeps its name)."""
    rows = session.execute(select(Choice.code, Choice.name).where(Choice.list == list_name))
    return {code: name for code, name in rows}


def check_code(session: Session, list_name: str, code: str | None, field: str) -> None:
    """422 on `field` unless `code` is empty or an active value of the list."""
    if code is None:
        return
    found = session.scalar(
        select(Choice.id).where(
            Choice.list == list_name, Choice.code == code, Choice.archived_at.is_(None)
        )
    )
    if found is None:
        raise ValidationAppError([ErrorDetail(field, fr.CHOICE_UNKNOWN)])


def get_choice(session: Session, choice_id: int) -> Choice:
    return get_or_404(session, Choice, choice_id, RESOURCE)


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", normalize_key(name)).strip("-")[:40] or "valeur"


def _check_name_free(session: Session, list_name: str, name: str, exclude_id: int | None) -> None:
    key = normalize_key(name)
    for other in session.scalars(select(Choice).where(Choice.list == list_name)):
        if other.id != exclude_id and normalize_key(other.name) == key:
            raise ValidationAppError([ErrorDetail("name", fr.CHOICE_NAME_TAKEN)])


def create_choice(session: Session, data: ChoiceCreate, clock: Clock) -> Choice:
    with session.begin():
        _check_name_free(session, data.list, data.name, None)
        codes = set(session.scalars(select(Choice.code).where(Choice.list == data.list)))
        base = code = _slug(data.name)
        n = 2
        while code in codes:
            code, n = f"{base}-{n}", n + 1
        order = data.sort_order
        if order is None:
            last = session.scalar(
                select(func.max(Choice.sort_order)).where(Choice.list == data.list)
            )
            order = (last or 0) + 10
        now = stamp(clock)
        choice = Choice(
            list=data.list,
            code=code,
            name=data.name,
            sort_order=order,
            created_at=now,
            updated_at=now,
        )
        session.add(choice)
    return choice


def update_choice(session: Session, choice_id: int, data: ChoiceUpdate, clock: Clock) -> Choice:
    with session.begin():
        choice = get_choice(session, choice_id)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes:
            _check_name_free(session, choice.list, changes["name"], choice.id)
        for field_name, value in changes.items():
            setattr(choice, field_name, value)
        choice.updated_at = stamp(clock)
    return choice


def archive_choice(session: Session, choice_id: int, clock: Clock) -> Choice:
    return common_archive(session, Choice, choice_id, RESOURCE, clock)


def unarchive_choice(session: Session, choice_id: int, clock: Clock) -> Choice:
    return common_unarchive(session, Choice, choice_id, RESOURCE, clock)
