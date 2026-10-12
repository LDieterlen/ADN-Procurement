"""Issued exports of a project (ADR-0009): the bytes are stored once per sha256, each issue is a row."""

from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.exports.book_pdf import build_book
from ffe.exports.po_pdf import build_po_pdf
from ffe.exports.schedule_xlsx import Variant, build_schedule
from ffe.models import Project, ProjectFile, ProjectItem, PurchaseOrderFile
from ffe.schemas.project_file import ProjectFileRead
from ffe.services.base import stamp
from ffe.services.file import store_bytes
from ffe.services.project import get_project
from ffe.services.purchase_order import get_po

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
        variant=row.variant,  # type: ignore[arg-type]
        issued_at=row.issued_at,
        indice=row.indice,
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


def issue_book(
    session: Session, files_dir: Path, project_id: int, clock: Clock
) -> tuple[ProjectFile, bytes]:
    """Client book PDF (ADR-0010), kept like a schedule export (`kind = 'book_pdf'`)."""
    today = clock().date()
    with session.begin():
        project = get_project(session, project_id)
        indice = stamp_indices(session, project_id, clock)
        _html, data = build_book(session, files_dir, project_id, today, indice)
        name = f"{project.code}-prescriptions-{indice}-{today.isoformat()}.pdf"
        file = store_bytes(
            session, files_dir, data, name, PDF_MIME, "pdf", clock, in_transaction=True
        )
        row = ProjectFile(
            project_id=project_id,
            file_id=file.id,
            kind="book_pdf",
            variant="client",
            issued_at=stamp(clock),
            indice=indice,
        )
        session.add(row)
    session.refresh(row)
    return row, data


def stamp_indices(session: Session, project_id: int, clock: Clock) -> str:
    """ADR-0012: the diffusion letter (A, B, C…) of this issue; every counted line changed since
    the previous issue (or never issued) takes it. `updated_at` is left untouched."""
    previous = session.scalars(
        select(ProjectFile)
        .where(ProjectFile.project_id == project_id, ProjectFile.kind == "book_pdf")
        .order_by(ProjectFile.issued_at.desc(), ProjectFile.id.desc())
    ).all()
    letter = chr(ord("A") + len(previous))
    last_issued = previous[0].issued_at if previous else None
    for item in session.scalars(select(ProjectItem).where(ProjectItem.project_id == project_id)):
        if item.indice is None or last_issued is None or item.updated_at > last_issued:
            item.indice = letter
    return letter


def issue_po_pdf(session: Session, files_dir: Path, po_id: int, clock: Clock) -> tuple[str, bytes]:
    """Purchase-order PDF, attached once per content to the order (reprints are free)."""
    today = clock().date()
    with session.begin():
        po = get_po(session, po_id)
        _html, data = build_po_pdf(session, files_dir, po_id)
        name = f"{po.number}-{today.isoformat()}.pdf"
        file = store_bytes(
            session, files_dir, data, name, PDF_MIME, "pdf", clock, in_transaction=True
        )
        if not any(j.file_id == file.id for j in po.files):
            now = stamp(clock)
            po.files.append(
                PurchaseOrderFile(
                    file_id=file.id, caption=f"BC {po.number} (PDF)", created_at=now, updated_at=now
                )
            )
    return name, data
