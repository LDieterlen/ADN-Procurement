"""`GET /health`: liveness only at step 1 (enriched with database facts at step 3)."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["system"])


class HealthRead(BaseModel):
    ok: bool


@router.get("/health", operation_id="getHealth")
def get_health() -> HealthRead:
    return HealthRead(ok=True)
