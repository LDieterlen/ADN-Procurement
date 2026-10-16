"""`project` service: code generation `<prefix><YYYY>-NNN`, status as archiving, read-only when closed."""

import re
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.i18n import fr
from ffe.models import (
    BudgetLine,
    Client,
    Project,
    ProjectDiffusion,
    Setting,
)
from ffe.models.project import PROJECT_CLOSED_STATUSES
from ffe.schemas.project import ProjectCreate, ProjectStatusChange, ProjectUpdate
from ffe.services.base import stamp
from ffe.services.file import check_logo, unlink_if_orphan

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
        check_logo(session, data.procurement_logo_file_id, "procurementLogoFileId")
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


def update_project(
    session: Session, project_id: int, data: ProjectUpdate, clock: Clock, files_dir: Path
) -> Project:
    with session.begin():
        project = ensure_open(get_project(session, project_id))
        changes = data.model_dump(exclude_unset=True)
        if "client_id" in changes and changes["client_id"] != project.client_id:
            _check_client(session, changes["client_id"])
        if "code" in changes and changes["code"] != project.code:
            _check_code_free(session, changes["code"], project_id)
        old_logo = project.procurement_logo_file_id
        if changes.get("procurement_logo_file_id") not in (None, old_logo):
            check_logo(session, changes["procurement_logo_file_id"], "procurementLogoFileId")
        for field_name, value in changes.items():
            setattr(project, field_name, value)
        project.updated_at = stamp(clock)
    if old_logo is not None and project.procurement_logo_file_id != old_logo:
        unlink_if_orphan(session, files_dir, old_logo)  # a replaced logo leaves the disk
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


def live_diffusions(session: Session, project_id: int) -> list[ProjectDiffusion]:
    return list(
        session.scalars(
            select(ProjectDiffusion)
            .where(ProjectDiffusion.project_id == project_id, ProjectDiffusion.revoked_at.is_(None))
            .order_by(ProjectDiffusion.number)
        )
    )


def is_diffused(session: Session, project_id: int) -> bool:
    """At least one live diffusion: the codes are frozen, a diffused article is cancelled, never
    deleted (ADR-0022)."""
    return bool(
        session.scalar(
            select(func.count())
            .select_from(ProjectDiffusion)
            .where(ProjectDiffusion.project_id == project_id, ProjectDiffusion.revoked_at.is_(None))
        )
    )
