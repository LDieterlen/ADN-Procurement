"""`file` service: content-addressed storage (`files/<sha256>.<ext>`), MIME sniffing, dedup, unlink."""

import hashlib
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ErrorDetail, NotFoundError, PayloadTooLargeError, ValidationAppError
from ffe.i18n import fr
from ffe.models import File, ProductFile
from ffe.services.base import stamp

RESOURCE = "file"
CHUNK = 1024 * 1024

# (magic prefix check, mime type, extension) — the client's name and declared type are ignored.
SIGNATURES: tuple[tuple[bytes, str, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", "png"),
    (b"%PDF", "application/pdf", "pdf"),
)


def sniff(head: bytes) -> tuple[str, str] | None:
    for magic, mime, ext in SIGNATURES:
        if head.startswith(magic):
            return mime, ext
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None


def get_file(session: Session, file_id: int) -> File:
    file = session.get(File, file_id)
    if file is None:
        raise NotFoundError(RESOURCE, file_id)
    return file


def content_path(files_dir: Path, file: File) -> Path:
    return files_dir / file.filename


def store_upload(
    session: Session,
    files_dir: Path,
    chunks: Iterator[bytes],
    original_name: str,
    limit_bytes: int,
    clock: Clock,
) -> tuple[File, bool]:
    """Streams the upload to `files/tmp`, hashes it, keeps one copy per sha256.

    Returns (file, created). An existing sha256 wins: the new bytes are discarded.
    """
    tmp_dir = files_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    head = b""
    staged = tmp_dir / f"upload-{id(chunks)}-{clock().timestamp():.0f}.part"
    with staged.open("wb") as out:
        for chunk in chunks:
            size += len(chunk)
            if size > limit_bytes:
                out.close()
                staged.unlink(missing_ok=True)
                raise PayloadTooLargeError(limit_bytes)
            if len(head) < 16:
                head += chunk[: 16 - len(head)]
            digest.update(chunk)
            out.write(chunk)
    try:
        if size == 0:
            raise ValidationAppError([ErrorDetail("file", fr.FILE_EMPTY)])
        kind = sniff(head)
        if kind is None:
            raise ValidationAppError([ErrorDetail("file", fr.FILE_TYPE_REFUSED)])
        mime, ext = kind
        sha256 = digest.hexdigest()
        with session.begin():
            existing = session.scalar(select(File).where(File.sha256 == sha256))
            if existing is not None:
                return existing, False
            final = files_dir / f"{sha256}.{ext}"
            staged.replace(final)
            file = File(
                sha256=sha256,
                ext=ext,
                mime_type=mime,
                size_bytes=size,
                original_name=original_name[:200] or f"{sha256[:8]}.{ext}",
                created_at=stamp(clock),
            )
            session.add(file)
        return file, True
    finally:
        staged.unlink(missing_ok=True)


def unlink_if_orphan(session: Session, files_dir: Path, file_id: int) -> bool:
    """Deletes the row and the bytes when no junction references the file any more."""
    with session.begin():
        file = session.get(File, file_id)
        if file is None:
            return False
        referenced = session.scalar(
            select(func.count()).select_from(ProductFile).where(ProductFile.file_id == file_id)
        )
        if referenced:
            return False
        content_path(files_dir, file).unlink(missing_ok=True)
        session.delete(file)
    return True


def orphans(session: Session, files_dir: Path) -> tuple[list[str], list[str]]:
    """(files on disk without a row, rows without a file on disk) — reported by `ffe db check`."""
    rows = {f.filename for f in session.scalars(select(File))}
    on_disk: set[str] = set()
    if files_dir.is_dir():
        on_disk = {p.name for p in files_dir.iterdir() if p.is_file()}
    return sorted(on_disk - rows), sorted(rows - on_disk)


def verify_hashes(session: Session, files_dir: Path) -> list[str]:
    """`ffe db check --files`: names of the files on disk whose content no longer matches their
    sha256 (bit rot or manual edit). Rows without a file are reported by `orphans`."""
    damaged: list[str] = []
    for file in session.scalars(select(File)):
        path = content_path(files_dir, file)
        if not path.is_file():
            continue
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        if digest.hexdigest() != file.sha256:
            damaged.append(file.filename)
    return sorted(damaged)
