"""Issued PDFs of a project (ADR-0009, ADR-0013): the bytes are stored once per sha256, each
issue is a row. The spec sheets and their diffusions are issued by `services/diffusion`
(ADR-0022); the listing here."""

import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.exports.pdf import PDF_MIME
from ffe.exports.prescription import build_list
from ffe.models import ProjectDiffusion, ProjectFile
from ffe.schemas.project_file import ProjectFileRead
from ffe.services.base import normalize_key, stamp
from ffe.services.file import store_bytes
from ffe.services.listing_profile import columns_of, get_profile
from ffe.services.project import get_project


def list_exports(session: Session, project_id: int) -> list[ProjectFile]:
    get_project(session, project_id)
    return list(
        session.scalars(
            select(ProjectFile)
            .where(ProjectFile.project_id == project_id)
            .order_by(ProjectFile.issued_at.desc(), ProjectFile.id.desc())
        )
    )


def to_read(session: Session, row: ProjectFile) -> ProjectFileRead:
    diffusion = session.get(ProjectDiffusion, row.diffusion_id) if row.diffusion_id else None
    return ProjectFileRead(
        id=row.id,
        project_id=row.project_id,
        file_id=row.file_id,
        kind=row.kind,  # type: ignore[arg-type]
        issued_at=row.issued_at,
        diffusion_number=diffusion.number if diffusion else None,
        diffusion_revoked=bool(diffusion and diffusion.revoked_at),
        original_name=row.file.original_name,
        size_bytes=row.file.size_bytes,
    )


def issue_list(
    session: Session,
    files_dir: Path,
    project_id: int,
    clock: Clock,
    printable: bool = False,
    profile_id: int | None = None,
    include_options: bool = False,
) -> tuple[ProjectFile, bytes]:
    """Listing PDF (`kind = 'list_pdf'`): the current indices, nothing stamped; the columns of a
    listing profile (ADR-0023), all of them without one."""
    today = clock().date()
    with session.begin():
        project = get_project(session, project_id)
        profile = get_profile(session, profile_id) if profile_id is not None else None
        columns = columns_of(profile) if profile else None
        _html, data = build_list(
            session,
            files_dir,
            project_id,
            today,
            printable,
            columns,
            profile.name if profile else None,
            include_options,
        )
        paper = "-impression" if printable else ""
        tag = f"-{_slug(profile.name)}" if profile else ""
        name = f"{project.code}-listing{tag}{paper}-{today.isoformat()}.pdf"
        file = store_bytes(
            session, files_dir, data, name, PDF_MIME, "pdf", clock, in_transaction=True
        )
        row = ProjectFile(
            project_id=project_id, file_id=file.id, kind="list_pdf", issued_at=stamp(clock)
        )
        session.add(row)
    session.refresh(row)
    return row, data


def _slug(name: str) -> str:
    """A file-name-safe tag from a profile name (« Achats » → « achats »)."""
    return re.sub(r"[^a-z0-9]+", "-", normalize_key(name)).strip("-") or "profil"
