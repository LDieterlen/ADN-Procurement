"""`project` service: code generation `<prefix><YYYY>-NNN`, status as archiving, read-only when closed."""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import (
    BudgetLine,
    Client,
    Project,
    ProjectIndice,
    ProjectItem,
    ProjectItemEvent,
    Setting,
)
from ffe.models.project import PROJECT_CLOSED_STATUSES
from ffe.schemas.project import ProjectCreate, ProjectStatusChange, ProjectUpdate
from ffe.services.base import stamp

RESOURCE = "project"


def list_projects(
    session: Session, status: str | None = None, client_id: int | None = None
) -> list[Project]:
    query = select(Project).order_by(Project.code.desc(), Project.id.desc())
    if status is not None:
        query = query.where(Project.status == status)
    if client_id is not None:
        query = query.where(Project.client_id == client_id)
    return list(session.scalars(query))


def get_project(session: Session, project_id: int) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise NotFoundError(RESOURCE, project_id)
    return project


def ensure_open(project: Project) -> Project:
    """Edits are refused on a closed or cancelled project (they play the archive role)."""
    if project.status in PROJECT_CLOSED_STATUSES:
        raise ConflictError(
            fr.PROJECT_READ_ONLY.format(
                id=project.id, status=fr.PROJECT_STATUS_LABELS[project.status].lower()
            )
        )
    return project


def _settings_row(session: Session) -> Setting:
    setting = session.get(Setting, 1)
    assert setting is not None, "setting row seeded by migration 0001"
    return setting


def next_code(session: Session, clock: Clock) -> str:
    """`<prefix><YYYY>-NNN`: MAX + 1 among this year's generated codes (D2.12), under UNIQUE(code)."""
    prefix = _settings_row(session).project_code_prefix
    year = clock().strftime("%Y")
    pattern = re.compile(rf"^{re.escape(prefix)}{year}-(\d+)$")
    highest = 0
    for code in session.scalars(select(Project.code)):
        match = pattern.match(code)
        if match:
            highest = max(highest, int(match.group(1)))
    return f"{prefix}{year}-{highest + 1:03d}"


def _check_client(session: Session, client_id: int) -> None:
    client = session.get(Client, client_id)
    if client is None:
        raise ValidationAppError(
            [
                ErrorDetail(
                    "clientId",
                    fr.NOT_FOUND.format(resource=fr.resource_label("client"), id=client_id),
                )
            ]
        )
    if client.archived_at is not None:
        raise ValidationAppError([ErrorDetail("clientId", fr.PROJECT_CLIENT_MUST_BE_ACTIVE)])


def _check_code_free(session: Session, code: str, exclude_id: int | None) -> None:
    taken = session.scalar(select(Project.id).where(Project.code == code))
    if taken is not None and taken != exclude_id:
        raise ValidationAppError([ErrorDetail("code", fr.PROJECT_CODE_TAKEN)])


def create_project(session: Session, data: ProjectCreate, clock: Clock) -> Project:
    with session.begin():
        _check_client(session, data.client_id)
        values = data.model_dump()
        code = values.pop("code") or next_code(session, clock)
        _check_code_free(session, code, None)
        global_budget = values.pop("global_budget_cents")
        now = stamp(clock)
        project = Project(**values, code=code, created_at=now, updated_at=now)
        session.add(project)
        if global_budget is not None:
            session.flush()
            session.add(
                BudgetLine(
                    project_id=project.id,
                    scope="global",
                    amount_cents=global_budget,
                    created_at=now,
                    updated_at=now,
                )
            )
    return project


def update_project(session: Session, project_id: int, data: ProjectUpdate, clock: Clock) -> Project:
    with session.begin():
        project = ensure_open(get_project(session, project_id))
        changes = data.model_dump(exclude_unset=True)
        if "client_id" in changes and changes["client_id"] != project.client_id:
            _check_client(session, changes["client_id"])
        if "code" in changes and changes["code"] != project.code:
            _check_code_free(session, changes["code"], project_id)
        for field_name, value in changes.items():
            setattr(project, field_name, value)
        project.updated_at = stamp(clock)
    return project


def change_status(
    session: Session, project_id: int, data: ProjectStatusChange, clock: Clock
) -> Project:
    """Free among the five statuses (D6c.2); `closed`/`cancelled` make the project read-only."""
    with session.begin():
        project = get_project(session, project_id)
        project.status = data.status
        project.updated_at = stamp(clock)
    return project


def open_project_count(session: Session, client_id: int) -> int:
    rows = session.scalars(
        select(Project.id).where(
            Project.client_id == client_id, Project.status.not_in(PROJECT_CLOSED_STATUSES)
        )
    )
    return len(list(rows))


def next_letter(current: str | None) -> str:
    """A, B … Z, AA, AB … (Excel-style)."""
    if not current:
        return "A"
    digits = [ord(ch) - 65 for ch in current]
    i = len(digits) - 1
    while i >= 0:
        if digits[i] < 25:
            digits[i] += 1
            return "".join(chr(65 + d) for d in digits)
        digits[i] = 0
        i -= 1
    return "A" + "".join(chr(65 + d) for d in digits)


def next_indice(session: Session, project_id: int, clock: Clock) -> Project:
    """Declares a new diffusion: the project takes the next letter and every article changed since
    the previous declaration (or never stamped) takes it too, each change journaled (`indice`
    event) so the declaration can be taken back. Exports never stamp anything (2026-10-13)."""
    with session.begin():
        project = ensure_open(get_project(session, project_id))
        letter = next_letter(project.indice)
        since = project.indice_changed_at
        now = stamp(clock)
        for item in session.scalars(
            select(ProjectItem).where(ProjectItem.project_id == project_id)
        ):
            if item.indice is None or since is None or item.updated_at > since:
                _journal_indice(session, item, letter, now)
        session.add(ProjectIndice(project_id=project_id, indice=letter, declared_at=now))
        project.indice = letter
        project.indice_changed_at = now
        project.updated_at = now
    return project


def revert_indice(session: Session, project_id: int, clock: Clock) -> Project:
    """Takes the last declaration back: the project returns to the previous letter and every
    article stamped by that declaration gets its former letter (journaled again)."""
    with session.begin():
        project = ensure_open(get_project(session, project_id))
        history = list(
            session.scalars(
                select(ProjectIndice)
                .where(ProjectIndice.project_id == project_id)
                .order_by(ProjectIndice.declared_at.desc(), ProjectIndice.id.desc())
            )
        )
        if not history:
            raise ConflictError(fr.PROJECT_NO_INDICE)
        last, previous = history[0], (history[1] if len(history) > 1 else None)
        now = stamp(clock)
        stamped = session.scalars(
            select(ProjectItemEvent)
            .join(ProjectItem, ProjectItem.id == ProjectItemEvent.project_item_id)
            .where(
                ProjectItem.project_id == project_id,
                ProjectItemEvent.kind == "indice",
                ProjectItemEvent.changed_at == last.declared_at,
                ProjectItemEvent.new_value == last.indice,
            )
        ).all()
        for event in stamped:
            item = session.get(ProjectItem, event.project_item_id)
            if item is not None and item.indice == last.indice:
                _journal_indice(session, item, event.old_value, now)
        session.delete(last)
        project.indice = previous.indice if previous else None
        project.indice_changed_at = previous.declared_at if previous else None
        project.updated_at = now
    return project


def _journal_indice(session: Session, item: ProjectItem, letter: str | None, now: str) -> None:
    session.add(
        ProjectItemEvent(
            project_item_id=item.id,
            kind="indice",
            old_value=item.indice,
            new_value=letter,
            changed_at=now,
        )
    )
    item.indice = letter
