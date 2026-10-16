"""`listing_profile` service (ADR-0023): the listing's column profiles, created, renamed,
re-columned and deleted from the settings (nothing references a profile)."""

import json

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.listing import in_catalogue_order
from ffe.models import ListingProfile
from ffe.schemas.listing_profile import ListingProfileCreate, ListingProfileUpdate
from ffe.services.base import normalize_key, stamp

RESOURCE = "listing_profile"


def list_profiles(session: Session) -> list[ListingProfile]:
    query = select(ListingProfile).order_by(ListingProfile.sort_order, ListingProfile.id)
    return list(session.scalars(query))


def get_profile(session: Session, profile_id: int) -> ListingProfile:
    profile = session.get(ListingProfile, profile_id)
    if profile is None:
        raise NotFoundError(RESOURCE, profile_id)
    return profile


def columns_of(profile: ListingProfile) -> list[str]:
    return in_catalogue_order(json.loads(profile.columns))


def _check_name_free(session: Session, name: str, exclude_id: int | None) -> None:
    key = normalize_key(name)
    for other in session.scalars(select(ListingProfile)):
        if other.id != exclude_id and normalize_key(other.name) == key:
            raise ValidationAppError([ErrorDetail("name", fr.LISTING_PROFILE_NAME_TAKEN)])


def create_profile(session: Session, data: ListingProfileCreate, clock: Clock) -> ListingProfile:
    with session.begin():
        _check_name_free(session, data.name, None)
        last = session.scalar(select(func.max(ListingProfile.sort_order)))
        now = stamp(clock)
        profile = ListingProfile(
            name=data.name,
            columns=json.dumps(in_catalogue_order(list(data.columns))),
            sort_order=(last or 0) + 10,
            created_at=now,
            updated_at=now,
        )
        session.add(profile)
    return profile


def update_profile(
    session: Session, profile_id: int, data: ListingProfileUpdate, clock: Clock
) -> ListingProfile:
    with session.begin():
        profile = get_profile(session, profile_id)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes:
            _check_name_free(session, changes["name"], profile.id)
        if "columns" in changes:
            changes["columns"] = json.dumps(in_catalogue_order(changes["columns"]))
        for field_name, value in changes.items():
            setattr(profile, field_name, value)
        profile.updated_at = stamp(clock)
    return profile


def delete_profile(session: Session, profile_id: int) -> None:
    with session.begin():
        session.delete(get_profile(session, profile_id))
