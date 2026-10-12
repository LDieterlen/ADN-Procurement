"""`category` service: the product types, one level, immutable code (ADR-0013)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.models import Category
from ffe.schemas.category import CategoryCreate, CategoryUpdate
from ffe.services.base import normalize_key, stamp
from ffe.services.common import archive as common_archive
from ffe.services.common import get_or_404
from ffe.services.common import unarchive as common_unarchive

RESOURCE = "category"


def list_categories(session: Session, include_archived: bool = False) -> list[Category]:
    query = select(Category).order_by(Category.sort_order, Category.id)
    if not include_archived:
        query = query.where(Category.archived_at.is_(None))
    return list(session.scalars(query))


def get_category(session: Session, category_id: int) -> Category:
    return get_or_404(session, Category, category_id, RESOURCE)


def _check_name_free(session: Session, name: str, exclude_id: int | None) -> None:
    key = normalize_key(name)
    for other in session.scalars(select(Category)):
        if other.id != exclude_id and normalize_key(other.name) == key:
            raise ValidationAppError([ErrorDetail("name", fr.CATEGORY_NAME_TAKEN)])


def create_category(session: Session, data: CategoryCreate, clock: Clock) -> Category:
    with session.begin():
        taken = session.scalar(select(Category.id).where(Category.code == data.code))
        if taken is not None:
            raise ValidationAppError([ErrorDetail("code", fr.CATEGORY_CODE_TAKEN)])
        _check_name_free(session, data.name, exclude_id=None)
        now = stamp(clock)
        category = Category(**data.model_dump(), created_at=now, updated_at=now)
        session.add(category)
    return category


def update_category(
    session: Session, category_id: int, data: CategoryUpdate, clock: Clock
) -> Category:
    with session.begin():
        category = get_category(session, category_id)
        if category.archived_at is not None:
            raise ConflictError(
                fr.ARCHIVED_READ_ONLY.format(resource=fr.resource_label(RESOURCE), id=category_id)
            )
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] != category.name:
            _check_name_free(session, changes["name"], exclude_id=category_id)
        for field_name, value in changes.items():
            setattr(category, field_name, value)
        category.updated_at = stamp(clock)
    return category


def archive_category(session: Session, category_id: int, clock: Clock) -> Category:
    return common_archive(session, Category, category_id, RESOURCE, clock)


def unarchive_category(session: Session, category_id: int, clock: Clock) -> Category:
    return common_unarchive(session, Category, category_id, RESOURCE, clock)
