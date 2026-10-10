"""Aggregates every v1 router; `app.py` mounts it under `/api/v1`."""

from fastapi import APIRouter

from ffe.api.v1 import category, client, health, manufacturer, supplier

router = APIRouter()
router.include_router(health.router)
router.include_router(client.router)
router.include_router(supplier.router)
router.include_router(manufacturer.router)
router.include_router(category.router)
