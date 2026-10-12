"""`project_file` DTO (DATA_MODEL §4.27): a PDF issued for a project."""

from typing import Literal

from ffe.schemas.base import BaseSchema

ExportKind = Literal["sheets_pdf", "list_pdf"]


class ProjectFileRead(BaseSchema):
    id: int
    project_id: int
    file_id: int
    kind: ExportKind
    issued_at: str
    indice: str | None = None  # spec sheets revision letter (ADR-0012)
    original_name: str
    size_bytes: int
