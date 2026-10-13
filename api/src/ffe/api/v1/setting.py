"""`/settings` router: a single resource, no id (API.md « Réglages »)."""

from fastapi import APIRouter

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.setting import SettingRead, SettingUpdate
from ffe.services import setting as service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", operation_id="getSettings")
def get_settings(session: SessionDep) -> SettingRead:
    return SettingRead.model_validate(service.get_settings(session))


@router.post("/extension-token", operation_id="generateExtensionToken")
def generate_extension_token(session: SessionDep, deps: DepsDep) -> SettingRead:
    return SettingRead.model_validate(service.generate_extension_token(session, deps.clock))


@router.patch("", operation_id="updateSettings")
def update_settings(payload: SettingUpdate, session: SessionDep, deps: DepsDep) -> SettingRead:
    return SettingRead.model_validate(service.update_settings(session, payload, deps.clock))
