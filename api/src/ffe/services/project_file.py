"""Issued PDFs of a project (ADR-0009, ADR-0013): the bytes are stored once per sha256, each
issue is a row; the spec sheets stamp the revision letter (ADR-0012)."""

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.exports.prescription import build_list, build_sheets
from ffe.models import ProjectFile, ProjectItem
from ffe.schemas.project_file import ProjectFileRead
from ffe.services.base import stamp
from ffe.services.file import store_bytes
from ffe.services.project import get_project

PDF_MIME = "application/pdf"


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
        issued_at=row.issued_at,
        indice=row.indice,
        original_name=row.file.original_name,
        size_bytes=row.file.size_bytes,
    )


def issue_sheets(
    session: Session, files_dir: Path, project_id: int, clock: Clock
) -> tuple[ProjectFile, bytes]:
    """Spec sheets PDF (`kind = 'sheets_pdf'`): stamps the indices, renders, keeps the file."""
    today = clock().date()
    with session.begin():
        project = get_project(session, project_id)
        indice = stamp_indices(session, project_id)
        _html, data = build_sheets(session, files_dir, project_id, today, indice)
        name = f"{project.code}-fiches-{indice}-{today.isoformat()}.pdf"
        file = store_bytes(
            session, files_dir, data, name, PDF_MIME, "pdf", clock, in_transaction=True
        )
        row = ProjectFile(
            project_id=project_id,
            file_id=file.id,
            kind="sheets_pdf",
            issued_at=stamp(clock),
            indice=indice,
        )
        session.add(row)
    session.refresh(row)
    return row, data


def issue_list(
    session: Session, files_dir: Path, project_id: int, clock: Clock
) -> tuple[ProjectFile, bytes]:
    """Listing PDF (`kind = 'list_pdf'`): the current indices, nothing stamped."""
    today = clock().date()
    with session.begin():
        project = get_project(session, project_id)
        _html, data = build_list(session, files_dir, project_id, today)
        name = f"{project.code}-listing-{today.isoformat()}.pdf"
        file = store_bytes(
            session, files_dir, data, name, PDF_MIME, "pdf", clock, in_transaction=True
        )
        row = ProjectFile(
            project_id=project_id, file_id=file.id, kind="list_pdf", issued_at=stamp(clock)
        )
        session.add(row)
    session.refresh(row)
    return row, data


def stamp_indices(session: Session, project_id: int) -> str:
    """ADR-0012: the diffusion letter (A, B, C…) of this issue; every line changed since the
    previous issue (or never issued) takes it. `updated_at` is left untouched."""
    previous = session.scalars(
        select(ProjectFile)
        .where(ProjectFile.project_id == project_id, ProjectFile.kind == "sheets_pdf")
        .order_by(ProjectFile.issued_at.desc(), ProjectFile.id.desc())
    ).all()
    letter = chr(ord("A") + len(previous))
    last_issued = previous[0].issued_at if previous else None
    for item in session.scalars(select(ProjectItem).where(ProjectItem.project_id == project_id)):
        if item.indice is None or last_issued is None or item.updated_at > last_issued:
            item.indice = letter
    return letter
