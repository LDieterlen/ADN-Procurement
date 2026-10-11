"""Issued exports of a project (ADR-0009): the bytes are stored once per sha256, each issue is a row."""

from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.exports.schedule_xlsx import Variant, build_schedule
from ffe.models import Project, ProjectFile
from ffe.schemas.project_file import ProjectFileRead
from ffe.services.base import stamp
from ffe.services.file import store_bytes
from ffe.services.project import get_project

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def list_exports(session: Session, project_id: int) -> list[ProjectFile]:
    get_project(session, project_id)
    return list(
        session.scalars(
            select(ProjectFile)
            .where(ProjectFile.project_id == project_id)
            .order_by(ProjectFile.issued_at.desc(), ProjectFile.id.desc())
        )
    )


def to_read(row: ProjectFile) -> ProjectFileRead:
    return ProjectFileRead(
        id=row.id,
        project_id=row.project_id,
        file_id=row.file_id,
        kind=row.kind,  # type: ignore[arg-type]
        variant=row.variant,  # type: ignore[arg-type]
        issued_at=row.issued_at,
        original_name=row.file.original_name,
        size_bytes=row.file.size_bytes,
    )


def schedule_filename(project: Project, variant: Variant, today: date) -> str:
    suffix = "client" if variant == "client" else "interne"
    return f"{project.code}-schedule-{suffix}-{today.isoformat()}.xlsx"


def issue_schedule(
    session: Session, files_dir: Path, project_id: int, variant: Variant, clock: Clock
) -> tuple[ProjectFile, bytes]:
    """Builds the workbook, keeps it under `files/`, records the issue; returns both."""
    today = clock().date()
    with session.begin():
        project = get_project(session, project_id)
        data = build_schedule(session, project_id, variant, today)
        name = schedule_filename(project, variant, today)
        file = store_bytes(
            session, files_dir, data, name, XLSX_MIME, "xlsx", clock, in_transaction=True
        )
        row = ProjectFile(
            project_id=project_id,
            file_id=file.id,
            kind="schedule_xlsx",
            variant=variant,
            issued_at=stamp(clock),
        )
        session.add(row)
    session.refresh(row)
    return row, data
