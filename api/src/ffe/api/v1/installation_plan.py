"""Floor plans of a project (ADR-0024), drawn in the middle of the installation pages."""

from typing import Annotated

from fastapi import APIRouter, Path, Response

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.installation_plan import (
    InstallationPlanCreate,
    InstallationPlanRead,
    InstallationPlanUpdate,
)
from ffe.services import installation_plan as service

router = APIRouter(tags=["installation"])

ProjectId = Annotated[int, Path(ge=1)]
PlanId = Annotated[int, Path(ge=1)]


@router.get("/projects/{project_id}/installation-plans", operation_id="listInstallationPlans")
def list_plans(project_id: ProjectId, session: SessionDep) -> list[InstallationPlanRead]:
    return [InstallationPlanRead.model_validate(p) for p in service.list_plans(session, project_id)]


@router.post(
    "/projects/{project_id}/installation-plans",
    status_code=201,
    operation_id="createInstallationPlan",
)
def create_plan(
    project_id: ProjectId, payload: InstallationPlanCreate, session: SessionDep, deps: DepsDep
) -> InstallationPlanRead:
    """`fileId`: an uploaded image, or a PDF whose first page is drawn."""
    plan = service.create_plan(session, deps.settings.files_dir, project_id, payload, deps.clock)
    return InstallationPlanRead.model_validate(plan)


@router.patch("/installation-plans/{plan_id}", operation_id="updateInstallationPlan")
def update_plan(
    plan_id: PlanId, payload: InstallationPlanUpdate, session: SessionDep, deps: DepsDep
) -> InstallationPlanRead:
    return InstallationPlanRead.model_validate(
        service.update_plan(session, plan_id, payload, deps.clock)
    )


@router.delete(
    "/installation-plans/{plan_id}", status_code=204, operation_id="deleteInstallationPlan"
)
def delete_plan(plan_id: PlanId, session: SessionDep, deps: DepsDep) -> Response:
    service.delete_plan(session, deps.settings.files_dir, plan_id)
    return Response(status_code=204)
