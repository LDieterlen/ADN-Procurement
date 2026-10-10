"""`category` service: two-level tree, immutable code and parent, DIV protected (D6a.2, D6a.9)."""

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
PROTECTED_CODE = "DIV"


def list_categories(session: Session, include_archived: bool = False) -> list[Category]:
    """Level 1 by sort_order, each followed by its children by sort_order (flat tree)."""
    query = select(Category)
    if not include_archived:
        query = query.where(Category.archived_at.is_(None))
    rows = list(session.scalars(query))
    parents = sorted((c for c in rows if c.parent_id is None), key=lambda c: (c.sort_order, c.id))
    children = sorted(
        (c for c in rows if c.parent_id is not None), key=lambda c: (c.sort_order, c.id)
    )
    ordered: list[Category] = []
    for parent in parents:
        ordered.append(parent)
        ordered.extend(c for c in children if c.parent_id == parent.id)
    return ordered


def get_category(session: Session, category_id: int) -> Category:
    return get_or_404(session, Category, category_id, RESOURCE)


def _check_name_free(
    session: Session, name: str, parent_id: int | None, exclude_id: int | None
) -> None:
    key = normalize_key(name)
    siblings = session.scalars(
        select(Category).where(
            Category.parent_id.is_(parent_id)
            if parent_id is None
            else Category.parent_id == parent_id
        )
    )
    for sibling in siblings:
        if sibling.id != exclude_id and normalize_key(sibling.name) == key:
            raise ValidationAppError([ErrorDetail("name", fr.CATEGORY_NAME_TAKEN)])


def create_category(session: Session, data: CategoryCreate, clock: Clock) -> Category:
    with session.begin():
        if data.parent_id is None:
            if data.code is None:
                raise ValidationAppError([ErrorDetail("code", fr.CATEGORY_CODE_REQUIRED)])
            taken = session.scalar(select(Category.id).where(Category.code == data.code))
            if taken is not None:
                raise ValidationAppError([ErrorDetail("code", fr.CATEGORY_CODE_TAKEN)])
        else:
            if data.code is not None:
                raise ValidationAppError([ErrorDetail("code", fr.CATEGORY_CODE_ON_CHILD)])
            parent = session.get(Category, data.parent_id)
            if parent is None:
                raise ValidationAppError([ErrorDetail("parentId", fr.CATEGORY_PARENT_NOT_FOUND)])
            if parent.parent_id is not None:
                raise ValidationAppError([ErrorDetail("parentId", fr.CATEGORY_PARENT_IS_CHILD)])
            if parent.archived_at is not None:
                raise ValidationAppError([ErrorDetail("parentId", fr.CATEGORY_PARENT_ARCHIVED)])
        _check_name_free(session, data.name, data.parent_id, exclude_id=None)
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
            _check_name_free(session, changes["name"], category.parent_id, exclude_id=category_id)
        for field_name, value in changes.items():
            setattr(category, field_name, value)
        category.updated_at = stamp(clock)
    return category


def archive_category(session: Session, category_id: int, clock: Clock) -> Category:
    with session.begin():
        category = get_category(session, category_id)
        if category.code == PROTECTED_CODE:
            raise ConflictError(fr.CATEGORY_DIV_PROTECTED)
        active_children = session.scalar(
            select(Category.id).where(
                Category.parent_id == category_id, Category.archived_at.is_(None)
            )
        )
        if active_children is not None:
            raise ConflictError(fr.CATEGORY_HAS_ACTIVE_CHILDREN)
    return common_archive(session, Category, category_id, RESOURCE, clock)


def unarchive_category(session: Session, category_id: int, clock: Clock) -> Category:
    with session.begin():
        category = get_category(session, category_id)
        if category.parent_id is not None:
            parent = session.get(Category, category.parent_id)
            if parent is not None and parent.archived_at is not None:
                raise ConflictError(fr.CATEGORY_PARENT_ARCHIVED)
    return common_unarchive(session, Category, category_id, RESOURCE, clock)
