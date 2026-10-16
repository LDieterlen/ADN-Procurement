"""Installation sheets in the schema itself (ADR-0024, DATA_MODEL §4.21): each CHECK and UNIQUE
fires past the API; listing profiles' JSON check too (ADR-0023)."""

from typing import Any

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from conftest import make_item, make_location, make_project
from ffe.deps import Clock
from ffe.schemas.installation_sheet import (
    InstallationCellIn,
    InstallationMarker,
    InstallationSheetCreate,
    InstallationSheetItemsSet,
)
from ffe.services.installation_sheet import create_sheet, set_items


@pytest.fixture
def sheet(session: Session, clock: Clock) -> dict[str, Any]:
    project = make_project(session, clock)
    room = make_location(session, clock, project.id, code="SAL", name="Salon", multiplier=1)
    item = make_item(session, clock, project.id, placements=[{"location_id": room.id}])
    created = create_sheet(
        session, project.id, InstallationSheetCreate(location_id=room.id, name="Coin TV"), clock
    )
    placement_id = item.placements[0].id
    cell = InstallationCellIn(placement_id=placement_id, markers=[InstallationMarker(x=1, y=2)])
    set_items(session, created.id, InstallationSheetItemsSet(cells=[cell]), clock)
    return {"id": created.id, "placement_id": placement_id}


@pytest.mark.parametrize(
    "statement",
    [
        "UPDATE installation_sheet SET per_page = 10",
        "UPDATE installation_sheet SET arrangement = 'left'",
        "UPDATE installation_sheet SET plan_rotation = 45",
        "UPDATE installation_sheet SET color_by_type = 2",
        "UPDATE installation_sheet SET name = ''",
        "UPDATE installation_sheet_item SET position = -1",
        "UPDATE installation_sheet_marker SET x_permille = 1001",
        "UPDATE installation_sheet_marker SET y_permille = -1",
        "UPDATE listing_profile SET columns = '{\"a\": 1}'",
    ],
)
def test_each_check_fires(engine: Engine, sheet: dict[str, Any], statement: str) -> None:
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(text(statement))


def test_a_placement_is_on_a_sheet_once(engine: Engine, sheet: dict[str, Any]) -> None:
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO installation_sheet_item (sheet_id, placement_id, position) "
                "VALUES (:sheet, :placement, 5)"
            ),
            {"sheet": sheet["id"], "placement": sheet["placement_id"]},
        )


def test_a_sheet_never_points_at_another_projects_room(
    engine: Engine, session: Session, clock: Clock, sheet: dict[str, Any]
) -> None:
    other = make_project(session, clock, name="Autre")
    room = make_location(session, clock, other.id, code="BUR", name="Bureau")
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(text("UPDATE installation_sheet SET location_id = :room"), {"room": room.id})
