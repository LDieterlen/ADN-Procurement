"""`project_file` DTO (DATA_MODEL §4.27): an export issued for a project."""

from typing import Literal

from ffe.schemas.base import BaseSchema

ExportKind = Literal["schedule_xlsx", "book_pdf"]
ExportVariant = Literal["internal", "client"]


class ProjectFileRead(BaseSchema):
    id: int
    project_id: int
    file_id: int
    kind: ExportKind
    variant: ExportVariant
    issued_at: str
    original_name: str
    size_bytes: int
