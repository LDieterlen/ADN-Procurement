"""Responses shared by the routers: a generated PDF, downloaded and never cached."""

from typing import Annotated, Any
from urllib.parse import quote

from fastapi import Query, Response

from ffe.exports.pdf import PDF_MIME

# `?print=true`: white paper for a printer instead of the tinted screen paper (2026-10-15).
PrintFlag = Annotated[bool, Query(alias="print")]
PDF_RESPONSE: dict[int | str, dict[str, Any]] = {200: {"content": {PDF_MIME: {}}}}


def pdf_response(name: str, data: bytes) -> Response:
    return Response(
        content=data,
        media_type=PDF_MIME,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}",
            "Cache-Control": "no-store",
        },
    )
