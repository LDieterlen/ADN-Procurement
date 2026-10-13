"""« Coller une adresse » (ADR-0014): the server reads one page on demand, extracts the generic
product fields, and can download its main image into `files/`. Nothing is stored before the user
validates (the image is stored only when asked for). The front never reaches the outside.

Extension inbox (ADR-0017): the browser sends the page it displays (URL + HTML, behind the shared
token); the same extraction runs, the result waits as a `capture` row until « Nouvel article »."""

import secrets
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.captures.extract import Extracted, extract
from ffe.deps import Clock
from ffe.errors import ErrorDetail, NotFoundError, UnauthorizedError, ValidationAppError
from ffe.i18n import fr
from ffe.models import Capture, File, Setting
from ffe.services.base import stamp
from ffe.services.file import sniff, store_bytes, unlink_if_orphan

MAX_BYTES = 3 * 1024 * 1024
MAX_HTML_BYTES = 5 * 1024 * 1024
RESOURCE = "capture"
TIMEOUT_S = 10
USER_AGENT = "Mozilla/5.0 (compatible; FFE/0.1; outil local de prescription, une page a la demande)"

Fetcher = Callable[[str, int], tuple[bytes, str]]  # (url, max_bytes) → (body, content type)


def _err(message: str) -> ValidationAppError:
    return ValidationAppError([ErrorDetail("url", message)])


def check_url(url: str) -> str:
    parts = urlsplit(url.strip())
    if parts.scheme not in ("http", "https") or not parts.netloc:
        raise _err(fr.CAPTURE_URL_INVALID)
    return url.strip()


def fetch_url(url: str, max_bytes: int = MAX_BYTES) -> tuple[bytes, str]:
    """Default fetcher: one GET, honest User-Agent, bounded size; errors become 422 on `url`."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:  # noqa: S310
            body = response.read(max_bytes + 1)
            content_type = str(response.headers.get("Content-Type", ""))
    except urllib.error.HTTPError as error:
        raise _err(fr.CAPTURE_HTTP_ERROR.format(status=error.code)) from error
    except urllib.error.URLError as error:
        raise _err(fr.CAPTURE_UNREACHABLE.format(reason=str(error.reason)[:120])) from error
    except (TimeoutError, OSError) as error:
        raise _err(fr.CAPTURE_UNREACHABLE.format(reason=str(error)[:120])) from error
    if len(body) > max_bytes:
        raise _err(fr.CAPTURE_TOO_LARGE)
    return body, content_type


def preview(url: str, fetcher: Fetcher = fetch_url) -> Extracted:
    body, content_type = fetcher(check_url(url), MAX_BYTES)
    if "html" not in content_type.lower() and b"<html" not in body[:4096].lower():
        raise _err(fr.CAPTURE_NOT_HTML)
    html = body.decode("utf-8", errors="replace")
    found = extract(html)
    if found.name is None:
        raise _err(fr.CAPTURE_NOTHING_FOUND)
    return found


def store_image(
    session: Session, files_dir: Path, url: str, clock: Clock, fetcher: Fetcher = fetch_url
) -> File:
    """Downloads the image behind `url` and keeps it like an upload (sha256, sniffed type)."""
    body, _content_type = fetcher(check_url(url), MAX_BYTES)
    kind = sniff(body[:16])
    if kind is None:
        raise _err(fr.CAPTURE_IMAGE_TYPE)
    mime, ext = kind
    name = urlsplit(url).path.rsplit("/", 1)[-1][:120] or f"image.{ext}"
    if not name.lower().endswith(f".{ext}"):
        name = f"{name}.{ext}"
    file = store_bytes(session, files_dir, body, name, mime, ext, clock)
    if file.source_url is None:
        with session.begin():
            file.source_url = url
    return file


# --- extension inbox (ADR-0017) ---------------------------------------------------------------


def require_extension_token(session: Session, token: str | None) -> None:
    """401 unless `token` equals the one generated on the settings page."""
    with session.begin():
        expected = session.scalar(select(Setting.extension_token).where(Setting.id == 1))
    if not token or not expected or not secrets.compare_digest(token, expected):
        raise UnauthorizedError(fr.EXTENSION_TOKEN_INVALID)


def _get(session: Session, capture_id: int) -> Capture:
    with session.begin():
        capture = session.get(Capture, capture_id)
    if capture is None:
        raise NotFoundError(RESOURCE, capture_id)
    return capture


def _image_bytes(session: Session, files_dir: Path, data: bytes, name: str, clock: Clock) -> File:
    kind = sniff(data[:16])
    if kind is None:
        raise ValidationAppError([ErrorDetail("image", fr.CAPTURE_IMAGE_TYPE)])
    mime, ext = kind
    if not name.lower().endswith(f".{ext}"):
        name = f"{name}.{ext}"
    return store_bytes(session, files_dir, data, name[:120], mime, ext, clock)


def create_capture(
    session: Session,
    files_dir: Path,
    url: str,
    html: str,
    clock: Clock,
    fetcher: Fetcher = fetch_url,
    image: bytes | None = None,
) -> Capture:
    """Extracts the sheet from the HTML the browser displays; keeps the image sent by the
    extension, else tries to download it (best effort: protected sites refuse the server)."""
    url = check_url(url)
    if len(html.encode("utf-8", errors="replace")) > MAX_HTML_BYTES:
        raise ValidationAppError([ErrorDetail("html", fr.CAPTURE_HTML_TOO_LARGE)])
    found = extract(html)
    if found.name is None:
        raise _err(fr.CAPTURE_NOTHING_FOUND)
    image_file: File | None = None
    if image:
        image_file = _image_bytes(session, files_dir, image, "image", clock)
    elif found.image_url:
        try:
            image_file = store_image(session, files_dir, found.image_url, clock, fetcher)
        except ValidationAppError:
            image_file = None
    with session.begin():
        capture = Capture(
            url=url,
            name=found.name,
            brand=found.brand,
            reference=found.reference,
            image_url=found.image_url,
            price_cents=found.price_cents,
            currency=found.currency,
            description=found.description,
            source=found.source,
            image_file_id=image_file.id if image_file else None,
            created_at=stamp(clock),
        )
        session.add(capture)
    return capture


def attach_capture_image(
    session: Session, files_dir: Path, capture_id: int, data: bytes, name: str, clock: Clock
) -> Capture:
    """The extension fetched the image itself (the server could not): keep it on the capture."""
    capture = _get(session, capture_id)
    image_file = _image_bytes(session, files_dir, data, name or "image", clock)
    with session.begin():
        capture.image_file_id = image_file.id
    with session.begin():
        session.refresh(capture)  # the view-only `image` relationship follows the new id
    return capture


def list_captures(session: Session) -> list[Capture]:
    with session.begin():
        query = select(Capture).order_by(Capture.created_at.desc(), Capture.id.desc())
        return list(session.scalars(query))


def delete_capture(session: Session, files_dir: Path, capture_id: int) -> None:
    """Used or dismissed: the row goes, the image too if nothing else references it."""
    capture = _get(session, capture_id)
    image_file_id = capture.image_file_id
    with session.begin():
        session.delete(capture)
    if image_file_id is not None:
        unlink_if_orphan(session, files_dir, image_file_id)
