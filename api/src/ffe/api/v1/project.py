"""`/projects` router: no archiving, `POST /projects/{id}/status` instead (API.md « Projets »)."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.project import (
    ProjectCreate,
    ProjectRead,
    ProjectStatus,
    ProjectStatusChange,
    ProjectUpdate,
)
from ffe.services import project as service

router = APIRouter(prefix="/projects", tags=["projects"])

ProjectId = Annotated[int, Path(ge=1)]


@router.get("", operation_id="listProjects")
def list_projects(
    session: SessionDep,
    status: ProjectStatus | None = None,
    client_id: Annotated[int | None, Query(alias="clientId", ge=1)] = None,
) -> list[ProjectRead]:
    return [
        ProjectRead.model_validate(p) for p in service.list_projects(session, status, client_id)
    ]


@router.post("", status_code=201, operation_id="createProject")
def create_project(payload: ProjectCreate, session: SessionDep, deps: DepsDep) -> ProjectRead:
    return ProjectRead.model_validate(service.create_project(session, payload, deps.clock))


@router.get("/{project_id}", operation_id="getProject")
def get_project(project_id: ProjectId, session: SessionDep) -> ProjectRead:
    return ProjectRead.model_validate(service.get_project(session, project_id))


@router.patch("/{project_id}", operation_id="updateProject")
def update_project(
    project_id: ProjectId, payload: ProjectUpdate, session: SessionDep, deps: DepsDep
) -> ProjectRead:
    return ProjectRead.model_validate(
        service.update_project(session, project_id, payload, deps.clock)
    )


@router.post("/{project_id}/status", operation_id="changeProjectStatus")
def change_project_status(
    project_id: ProjectId, payload: ProjectStatusChange, session: SessionDep, deps: DepsDep
) -> ProjectRead:
    return ProjectRead.model_validate(
        service.change_status(session, project_id, payload, deps.clock)
    )
