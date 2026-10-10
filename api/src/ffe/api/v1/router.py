"""Aggregates every v1 router; `app.py` mounts it under `/api/v1`."""

from fastapi import APIRouter

from ffe.api.v1 import client, health

router = APIRouter()
router.include_router(health.router)
router.include_router(client.router)
