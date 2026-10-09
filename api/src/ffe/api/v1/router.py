"""Aggregates every v1 router; `app.py` mounts it under `/api/v1`."""

from fastapi import APIRouter

from ffe.api.v1 import health

router = APIRouter()
router.include_router(health.router)
