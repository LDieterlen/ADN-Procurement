"""« Coller une adresse » (ADR-0014): the server reads one page on demand, extracts the generic
product fields, and can download its main image into `files/`. Nothing is stored before the user
validates (the image is stored only when asked for). The front never reaches the outside."""

import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy.orm import Session

from ffe.captures.extract import Extracted, extract
from ffe.deps import Clock
from ffe.errors import ErrorDetail, ValidationAppError
from ffe.i18n import fr
from ffe.models import File
from ffe.services.file import sniff, store_bytes

MAX_BYTES = 3 * 1024 * 1024
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
