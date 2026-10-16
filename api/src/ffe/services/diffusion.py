"""Diffusions of a project's spec sheets (ADR-0022): the indice is chosen when the sheets are
issued, never declared apart.

- A diffusion is official: the first carries no indice (« - ») and freezes the codes; each later
  one gives the next letter to every code whose product changed (an option retained: the code now
  shows another article) and « A » to every code shown for the first time. Nothing else moves an
  indice (a name or a price is not a new product).
- A working document (no diffusion) prints the indices the next diffusion would give (shown live
  on the pages too) and changes nothing.
- The last diffusion can be taken back: the codes and articles return to their state before it;
  its row and its PDFs stay, marked as cancelled.
"""

import json
from pathlib import Path
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError
from ffe.exports.pdf import PDF_MIME
from ffe.exports.prescription import build_sheets, coming_changes
from ffe.i18n import fr
from ffe.models import (
    ProjectDiffusion,
    ProjectFile,
    ProjectItem,
    ProjectItemEvent,
    ProjectItemPlacement,
)
from ffe.services.base import stamp
from ffe.services.file import store_bytes
from ffe.services.project import ensure_open, get_project, live_diffusions

Paper = Literal["color", "white"]


def _state(placements: list[ProjectItemPlacement]) -> str:
    """Journal form of a set of codes: id → [indice, diffused article]."""
    return json.dumps(
        {str(p.id): [p.indice, p.diffused_item_id] for p in placements}, separators=(",", ":")
    )


def _diffuse(
    session: Session, project_id: int, include_options: bool, clock: Clock
) -> ProjectDiffusion:
    """Creates diffusion n and moves the indices (inside the caller's transaction)."""
    now = stamp(clock)
    number = len(live_diffusions(session, project_id)) + 1
    diffusion = ProjectDiffusion(project_id=project_id, number=number, issued_at=now)
    session.add(diffusion)
    session.flush()
    note = f"diffusion:{diffusion.id}"
    for item in session.scalars(
        select(ProjectItem).where(
            ProjectItem.project_id == project_id,
            ProjectItem.kind == "product",
            ProjectItem.status != "cancelled",
        )
    ):
        if item.option_of_id is not None and not include_options:
            continue
        before = _state(item.placements)
        for placement in item.placements:
            placement.indice = placement.coming_indice(item.id)
            placement.diffused_item_id = item.id
        first = item.first_diffusion_id is None
        if first:
            item.first_diffusion_id = diffusion.id
        after = _state(item.placements)
        if first or after != before:
            session.add(
                ProjectItemEvent(
                    project_item_id=item.id,
                    kind="indice",
                    old_value=before,
                    new_value=after,
                    changed_at=now,
                    note=note,
                )
            )
    return diffusion


def issue_sheets(
    session: Session,
    files_dir: Path,
    project_id: int,
    clock: Clock,
    *,
    diffuse: bool,
    papers: list[Paper],
    include_options: bool = False,
    hide_agency_name: bool = False,
    hide_studio: bool = False,
    hide_agency_logo: bool = False,
) -> list[ProjectFile]:
    """Issues the spec sheets, one PDF per paper (tinted for the screen, white for a printer);
    `diffuse` makes them an official diffusion first (indices moved, ADR-0022). All or nothing."""
    today = clock().date()
    rows: list[ProjectFile] = []
    with session.begin():
        project = get_project(session, project_id)
        if diffuse:
            ensure_open(project)
        changes = coming_changes(session, project_id)  # what this issue brings, before it moves
        diffusion = _diffuse(session, project_id, include_options, clock) if diffuse else None
        for paper in dict.fromkeys(papers):  # each paper once, in the order asked
            printable = paper == "white"
            _html, data = build_sheets(
                session,
                files_dir,
                project_id,
                today,
                diffusion.number if diffusion else None,
                printable,
                include_options,
                changes,
                hide_agency_name=hide_agency_name,
                hide_studio=hide_studio,
                hide_agency_logo=hide_agency_logo,
            )
            tag = f"-diffusion{diffusion.number}" if diffusion else ""
            suffix = "-impression" if printable else ""
            name = f"{project.code}-fiches{tag}{suffix}-{today.isoformat()}.pdf"
            file = store_bytes(
                session, files_dir, data, name, PDF_MIME, "pdf", clock, in_transaction=True
            )
            row = ProjectFile(
                project_id=project_id,
                file_id=file.id,
                kind="sheets_pdf",
                issued_at=stamp(clock),
                diffusion_id=diffusion.id if diffusion else None,
            )
            session.add(row)
            rows.append(row)
    for row in rows:
        session.refresh(row)
    return rows


def revert_last_diffusion(session: Session, project_id: int, clock: Clock) -> ProjectDiffusion:
    """Takes the last live diffusion back: each code returns to its indice and diffused article
    before it, each article it presented first becomes « never shown » again; journaled."""
    with session.begin():
        ensure_open(get_project(session, project_id))
        diffusions = live_diffusions(session, project_id)
        if not diffusions:
            raise ConflictError(fr.PROJECT_NO_DIFFUSION)
        last = diffusions[-1]
        now = stamp(clock)
        events = session.scalars(
            select(ProjectItemEvent).where(
                ProjectItemEvent.kind == "indice", ProjectItemEvent.note == f"diffusion:{last.id}"
            )
        ).all()
        for event in events:
            item = session.get(ProjectItem, event.project_item_id)
            if item is None:
                continue
            saved: dict[str, list[object]] = json.loads(event.old_value or "{}")
            # By id, wherever the placement is now: an option retained since took its base's
            # placements (ADR-0021), they must come back all the same.
            placements = [
                p
                for key in saved
                if (p := session.get(ProjectItemPlacement, int(key))) is not None
                and p.project_id == project_id
            ]
            before = _state(placements)
            for placement in placements:
                indice, diffused = saved[str(placement.id)]
                placement.indice = indice if isinstance(indice, str) else None
                placement.diffused_item_id = diffused if isinstance(diffused, int) else None
            if item.first_diffusion_id == last.id:
                item.first_diffusion_id = None
            session.add(
                ProjectItemEvent(
                    project_item_id=item.id,
                    kind="indice",
                    old_value=before,
                    new_value=_state(placements),
                    changed_at=now,
                    note=f"annulation:{last.id}",
                )
            )
        last.revoked_at = now
    return last
