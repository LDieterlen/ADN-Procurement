"""`project_file` DTO (DATA_MODEL §4.27): a PDF issued for a project."""

from typing import Literal

from pydantic import Field

from ffe.schemas.base import BaseSchema

ExportKind = Literal["sheets_pdf", "list_pdf"]


class ProjectFileRead(BaseSchema):
    id: int
    project_id: int
    file_id: int
    kind: ExportKind
    issued_at: str
    diffusion_number: int | None = None  # official diffusion n (ADR-0022); None = working document
    diffusion_revoked: bool = False  # that diffusion was taken back
    original_name: str
    size_bytes: int


Paper = Literal["color", "white"]


class SheetsIssue(BaseSchema):
    """« Fiches PDF » (ADR-0022): an official diffusion or a working document, on one or two
    papers (tinted for the screen, white for a printer), options included or not."""

    diffuse: bool = False
    papers: list[Paper] = Field(default_factory=lambda: ["color"], min_length=1)
    include_options: bool = False
    # Advanced options (2026-10-16): leave the agency's name (bottom left), the « Racoon Studio »
    # mark (bottom centre) or the agency's logo (top left) off these sheets.
    hide_agency_name: bool = False
    hide_studio: bool = False
    hide_agency_logo: bool = False
