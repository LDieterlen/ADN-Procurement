"""`/listing-profiles` router (ADR-0023): which columns a listing prints, by recipient."""

from typing import Annotated

from fastapi import APIRouter, Path, Response

from ffe.deps import DepsDep, SessionDep
from ffe.i18n import fr
from ffe.listing import COLUMNS
from ffe.schemas.listing_profile import (
    ListingColumnRead,
    ListingProfileCreate,
    ListingProfileRead,
    ListingProfileUpdate,
)
from ffe.services import listing_profile as service

router = APIRouter(prefix="/listing-profiles", tags=["listing-profiles"])

ProfileId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listListingProfiles")
def list_profiles(session: SessionDep) -> list[ListingProfileRead]:
    return [ListingProfileRead.model_validate(p) for p in service.list_profiles(session)]


@router.get("/columns", operation_id="listListingColumns")
def list_columns() -> list[ListingColumnRead]:
    """The column catalogue, in printing order, with its French labels."""
    return [
        ListingColumnRead.model_validate({"key": c, "label": fr.LISTING_COLUMN_LABELS[c]})
        for c in COLUMNS
    ]


@router.post("", status_code=201, operation_id="createListingProfile")
def create_profile(
    payload: ListingProfileCreate, session: SessionDep, deps: DepsDep
) -> ListingProfileRead:
    return ListingProfileRead.model_validate(service.create_profile(session, payload, deps.clock))


@router.patch("/{profile_id}", operation_id="updateListingProfile")
def update_profile(
    profile_id: ProfileId, payload: ListingProfileUpdate, session: SessionDep, deps: DepsDep
) -> ListingProfileRead:
    return ListingProfileRead.model_validate(
        service.update_profile(session, profile_id, payload, deps.clock)
    )


@router.delete("/{profile_id}", status_code=204, operation_id="deleteListingProfile")
def delete_profile(profile_id: ProfileId, session: SessionDep) -> Response:
    service.delete_profile(session, profile_id)
    return Response(status_code=204)
