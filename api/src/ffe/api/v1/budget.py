"""Budgets: `GET/PUT /projects/{id}/budget-lines`, `GET /projects/{id}/alerts`, `GET /dashboard`."""

from typing import Annotated

from fastapi import APIRouter, Path

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.budget import AlertRead, BudgetLineRead, BudgetLinesPut, DashboardProjectRead
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


@router.get("/projects/{project_id}/alerts", operation_id="listProjectAlerts")
def list_alerts(project_id: ProjectId, session: SessionDep, deps: DepsDep) -> list[AlertRead]:
    return [
        AlertRead.model_validate(a)
        for a in service.alerts(session, project_id, deps.clock().date())
    ]


@router.get("/dashboard", operation_id="getDashboard")
def get_dashboard(session: SessionDep, deps: DepsDep) -> list[DashboardProjectRead]:
    return [
        DashboardProjectRead.model_validate(r)
        for r in service.dashboard(session, deps.clock().date())
    ]
