"""Budgets: `GET/PUT /projects/{id}/budget-lines` and the summary `GET /projects/{id}/summary`."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.budget import BudgetLineRead, BudgetLinesPut, ProjectSummaryRead
from ffe.services import budget as service

router = APIRouter(tags=["budgets"])

ProjectId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/budget-lines", operation_id="listBudgetLines")
def list_budget_lines(project_id: ProjectId, session: SessionDep) -> list[BudgetLineRead]:
    return [
        BudgetLineRead.model_validate(b) for b in service.list_budget_lines(session, project_id)
    ]


@router.put("/projects/{project_id}/budget-lines", operation_id="putBudgetLines")
def put_budget_lines(
    project_id: ProjectId, payload: BudgetLinesPut, session: SessionDep, deps: DepsDep
) -> list[BudgetLineRead]:
    rows = service.put_budget_lines(session, project_id, payload, deps.clock)
    return [BudgetLineRead.model_validate(b) for b in rows]


@router.get("/projects/{project_id}/summary", operation_id="getProjectSummary")
def get_summary(
    project_id: ProjectId,
    session: SessionDep,
    location_id: Annotated[int | None, Query(alias="locationId", ge=1)] = None,
    zone: Annotated[str | None, Query(max_length=200)] = None,
    family: Annotated[str | None, Query(max_length=40)] = None,
    category_id: Annotated[int | None, Query(alias="categoryId", ge=1)] = None,
    supplier_id: Annotated[int | None, Query(alias="supplierId", ge=1)] = None,
) -> ProjectSummaryRead:
    filters = service.SummaryFilter(
        location_id=location_id,
        zone=zone,
        family=family,
        category_id=category_id,
        supplier_id=supplier_id,
    )
    return ProjectSummaryRead.model_validate(service.summary(session, project_id, filters))
