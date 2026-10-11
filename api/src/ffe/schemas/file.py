"""`file` DTO (upload result and export row)."""

from ffe.schemas.base import BaseSchema


class FileRead(BaseSchema):
    id: int
    sha256: str
    ext: str
    mime_type: str
    size_bytes: int
    original_name: str
    source_url: str | None
    license_note: str | None = None
    created_at: str
