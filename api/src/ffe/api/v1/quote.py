"""Quotes: nested list/create under a project, flat `/quotes/{id}`, lines, retain, files,
comparison per project line (API.md « Devis »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.project_item import ProjectItemRead
from ffe.schemas.quote import (
    ItemQuoteRead,
    QuoteCreate,
    QuoteFileAttach,
    QuoteLineCreate,
    QuoteLineUpdate,
    QuoteRead,
    QuoteUpdate,
)
from ffe.services import quote as service

router = APIRouter(tags=["quotes"])

ProjectId = Annotated[int, Path(ge=1)]
QuoteId = Annotated[int, Path(ge=1)]
LineId = Annotated[int, Path(ge=1)]
ItemId = Annotated[int, Path(ge=1)]
FileId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/quotes", operation_id="listQuotes")
def list_quotes(project_id: ProjectId, session: SessionDep) -> list[QuoteRead]:
    return [service.to_read(session, q) for q in service.list_quotes(session, project_id)]


@router.post("/projects/{project_id}/quotes", status_code=201, operation_id="createQuote")
def create_quote(
    project_id: ProjectId, payload: QuoteCreate, session: SessionDep, deps: DepsDep
) -> QuoteRead:
    return service.to_read(session, service.create_quote(session, project_id, payload, deps.clock))


@router.get("/quotes/{quote_id}", operation_id="getQuote")
def get_quote(quote_id: QuoteId, session: SessionDep) -> QuoteRead:
    return service.to_read(session, service.get_quote(session, quote_id))


@router.patch("/quotes/{quote_id}", operation_id="updateQuote")
def update_quote(
    quote_id: QuoteId, payload: QuoteUpdate, session: SessionDep, deps: DepsDep
) -> QuoteRead:
    return service.to_read(session, service.update_quote(session, quote_id, payload, deps.clock))


@router.post("/quotes/{quote_id}/decline", operation_id="declineQuote")
def decline_quote(quote_id: QuoteId, session: SessionDep, deps: DepsDep) -> QuoteRead:
    return service.to_read(session, service.decline_quote(session, quote_id, deps.clock))


@router.delete("/quotes/{quote_id}", status_code=204, operation_id="deleteQuote")
def delete_quote(quote_id: QuoteId, session: SessionDep) -> Response:
    service.delete_quote(session, quote_id)
    return Response(status_code=204)


@router.post("/quotes/{quote_id}/lines", status_code=201, operation_id="addQuoteLine")
def add_line(
    quote_id: QuoteId, payload: QuoteLineCreate, session: SessionDep, deps: DepsDep
) -> QuoteRead:
    return service.to_read(session, service.add_line(session, quote_id, payload, deps.clock))


@router.patch("/quote-lines/{line_id}", operation_id="updateQuoteLine")
def update_line(
    line_id: LineId, payload: QuoteLineUpdate, session: SessionDep, deps: DepsDep
) -> QuoteRead:
    return service.to_read(session, service.update_line(session, line_id, payload, deps.clock))


@router.delete("/quote-lines/{line_id}", operation_id="deleteQuoteLine")
def delete_line(line_id: LineId, session: SessionDep, deps: DepsDep) -> QuoteRead:
    return service.to_read(session, service.delete_line(session, line_id, deps.clock))


@router.post("/quote-lines/{line_id}/retain", operation_id="retainQuoteLine")
def retain_line(line_id: LineId, session: SessionDep, deps: DepsDep) -> ProjectItemRead:
    return ProjectItemRead.from_model(service.retain_line(session, line_id, deps.clock))


@router.get("/project-items/{item_id}/quotes", operation_id="listProjectItemQuotes")
def item_quotes(item_id: ItemId, session: SessionDep) -> list[ItemQuoteRead]:
    return service.item_quotes(session, item_id)


@router.post("/quotes/{quote_id}/files", status_code=201, operation_id="attachQuoteFile")
def attach_file(
    quote_id: QuoteId, payload: QuoteFileAttach, session: SessionDep, deps: DepsDep
) -> QuoteRead:
    return service.to_read(session, service.attach_file(session, quote_id, payload, deps.clock))


@router.delete("/quotes/{quote_id}/files/{file_id}", operation_id="detachQuoteFile")
def detach_file(
    quote_id: QuoteId, file_id: FileId, session: SessionDep, deps: DepsDep
) -> QuoteRead:
    return service.to_read(
        session,
        service.detach_file(session, quote_id, file_id, deps.settings.files_dir, deps.clock),
    )
