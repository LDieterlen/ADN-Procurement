"""Installation PDF (ADR-0024): one sheet, or every sheet of a room or of the project, as A3
pages. A working document downloaded at once, never stored (no `project_file` row)."""

from pathlib import Path

from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import NotFoundError
from ffe.exports.installation import build_installation
from ffe.models import Location
from ffe.services.installation_sheet import get_sheet, list_sheets
from ffe.services.project import get_project


def sheet_pdf(
    session: Session, files_dir: Path, sheet_id: int, clock: Clock, printable: bool = False
) -> tuple[str, bytes]:
    today = clock().date()
    with session.begin():
        sheet = get_sheet(session, sheet_id)
        project = get_project(session, sheet.project_id)
        _html, data = build_installation(session, files_dir, project.id, [sheet], today, printable)
        return f"{project.code}-installation-{sheet.id}-{today.isoformat()}.pdf", data


def project_pdf(
    session: Session,
    files_dir: Path,
    project_id: int,
    clock: Clock,
    location_id: int | None = None,
    printable: bool = False,
) -> tuple[str, bytes]:
    """Every sheet, room by room in the order of the locations; one room with `location_id`."""
    today = clock().date()
    with session.begin():
        project = get_project(session, project_id)
        sheets = list_sheets(session, project_id)
        locations = {
            loc.id: loc for loc in (session.get(Location, s.location_id) for s in sheets) if loc
        }
        if location_id is not None:
            location = session.get(Location, location_id)
            if location is None or location.project_id != project_id:
                raise NotFoundError("location", location_id)
            sheets = [s for s in sheets if s.location_id == location_id]
        sheets.sort(
            key=lambda s: (locations[s.location_id].sort_order, s.location_id, s.sort_order, s.id)
        )
        _html, data = build_installation(session, files_dir, project_id, sheets, today, printable)
        tag = f"-{locations[location_id].code}" if location_id in locations else ""
        return f"{project.code}-installation{tag}-{today.isoformat()}.pdf", data
