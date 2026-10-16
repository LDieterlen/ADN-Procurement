"""`installation_plan` service (ADR-0024): floor plans of a project. A PDF plan is rendered once,
on upload, to an image of its first page (pypdfium2); white margins are cut off (a PDF or an
image); the upload is kept beside the image drawn."""

from io import BytesIO
from pathlib import Path
from typing import Any, cast

import pypdfium2 as pdfium  # pyright: ignore[reportMissingTypeStubs]
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ConflictError, ErrorDetail, NotFoundError, ValidationAppError
from ffe.exports.pdf import upright
from ffe.i18n import fr
from ffe.models import File, InstallationPlan, InstallationSheet
from ffe.schemas.installation_plan import InstallationPlanCreate, InstallationPlanUpdate
from ffe.services.base import stamp
from ffe.services.file import content_path, get_file, store_bytes, unlink_if_orphan
from ffe.services.project import ensure_open, get_project

RESOURCE = "installation_plan"
PDF_DPI = 200  # an A3 plan → about 3300 × 2300 px: sharp on paper, a few MB
MAX_SIDE = 5000  # px, whatever the PDF's page size
ORIENTATION = 0x0112  # EXIF tag
PAPER = 235  # grey level above which a pixel counts as blank paper (margins cut off)


def list_plans(session: Session, project_id: int) -> list[InstallationPlan]:
    get_project(session, project_id)
    query = (
        select(InstallationPlan)
        .where(InstallationPlan.project_id == project_id)
        .order_by(InstallationPlan.id)
    )
    return list(session.scalars(query))


def get_plan(session: Session, plan_id: int) -> InstallationPlan:
    plan = session.get(InstallationPlan, plan_id)
    if plan is None:
        raise NotFoundError(RESOURCE, plan_id)
    return plan


def pdf_first_page(path: Path) -> Image.Image:
    """The first page of a PDF as an image; ValidationAppError when it cannot be read."""
    try:
        document = pdfium.PdfDocument(path)
        try:
            page = document[0]
            width, height = page.get_size()  # PDF points (1/72 in)
            scale = min(PDF_DPI / 72, MAX_SIDE / max(width, height, 1))
            render: Any = page.render  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
            return cast(Image.Image, render(scale=scale).to_pil()).convert("RGB")
        finally:
            document.close()
    except (pdfium.PdfiumError, IndexError) as error:  # pyright: ignore[reportUnknownMemberType]
        raise ValidationAppError([ErrorDetail("fileId", fr.PLAN_PDF_UNREADABLE)]) from error


def trim_margins(image: Image.Image) -> Image.Image | None:
    """The plan (upright and opaque: `pdf.upright`) without its white margins (2026-10-16): the box of the pixels darker than paper,
    plus a thin border; None when there is nothing worth cutting (or nothing drawn at all)."""
    lut = [255 if level < PAPER else 0 for level in range(256)]  # ink white, paper black
    ink = image.convert("L").point(lut)  # pyright: ignore[reportUnknownMemberType]
    box = ink.getbbox()
    if box is None:
        return None
    pad = max(8, max(image.size) // 100)
    left, top = max(0, box[0] - pad), max(0, box[1] - pad)
    right, bottom = min(image.width, box[2] + pad), min(image.height, box[3] + pad)
    kept = (right - left) * (bottom - top)
    if kept > 0.95 * image.width * image.height:
        return None
    return image.crop((left, top, right, bottom))


def _drawn_file(session: Session, files_dir: Path, file: File, clock: Clock) -> File:
    """The image drawn for an upload: a PDF's first page, white margins cut off; the upload
    itself when it is an image without margins."""
    if file.mime_type == "application/pdf":
        image = upright(pdf_first_page(content_path(files_dir, file)))
        image = trim_margins(image) or image
    elif file.mime_type.startswith("image/"):
        # Stored upright and opaque: an EXIF rotation or a transparent background never reaches
        # the sheets, and the dots are placed on the image as stored.
        try:
            with Image.open(content_path(files_dir, file)) as opened:
                seen = upright(opened)
                plain = opened.getexif().get(ORIENTATION, 1) == 1 and opened.mode in ("RGB", "L")
        except OSError, UnidentifiedImageError, ValueError, Image.DecompressionBombError:
            raise ValidationAppError([ErrorDetail("fileId", fr.PLAN_FILE_REFUSED)]) from None
        trimmed = trim_margins(seen)
        if trimmed is None and plain:
            return file
        image = trimmed or seen
    else:
        raise ValidationAppError([ErrorDetail("fileId", fr.PLAN_FILE_REFUSED)])
    buffer = BytesIO()
    image.convert("RGB").save(buffer, "PNG", optimize=True)
    name = f"{Path(file.original_name).stem}.png"
    return store_bytes(
        session, files_dir, buffer.getvalue(), name, "image/png", "png", clock, in_transaction=True
    )


def create_plan(
    session: Session, files_dir: Path, project_id: int, data: InstallationPlanCreate, clock: Clock
) -> InstallationPlan:
    with session.begin():
        ensure_open(get_project(session, project_id))
        try:
            uploaded = get_file(session, data.file_id)
        except NotFoundError as error:
            raise ValidationAppError([ErrorDetail("fileId", fr.PLAN_FILE_REFUSED)]) from error
        drawn = _drawn_file(session, files_dir, uploaded, clock)
        now = stamp(clock)
        plan = InstallationPlan(
            project_id=project_id,
            name=data.name or Path(uploaded.original_name).stem or uploaded.original_name,
            file_id=drawn.id,
            source_file_id=uploaded.id if drawn.id != uploaded.id else None,
            created_at=now,
            updated_at=now,
        )
        session.add(plan)
    return plan


def update_plan(
    session: Session, plan_id: int, data: InstallationPlanUpdate, clock: Clock
) -> InstallationPlan:
    with session.begin():
        plan = get_plan(session, plan_id)
        ensure_open(get_project(session, plan.project_id))
        plan.name = data.name
        plan.updated_at = stamp(clock)
    return plan


def delete_plan(session: Session, files_dir: Path, plan_id: int) -> None:
    """A plan still drawn on a sheet is kept (409); its files go when nothing else uses them."""
    with session.begin():
        plan = get_plan(session, plan_id)
        ensure_open(get_project(session, plan.project_id))
        used = session.scalar(
            select(func.count())
            .select_from(InstallationSheet)
            .where(InstallationSheet.plan_id == plan_id)
        )
        if used:
            raise ConflictError(fr.PLAN_IN_USE.format(count=used))
        file_ids = [plan.file_id, plan.source_file_id]
        session.delete(plan)
    for file_id in file_ids:
        if file_id is not None:
            unlink_if_orphan(session, files_dir, file_id)
