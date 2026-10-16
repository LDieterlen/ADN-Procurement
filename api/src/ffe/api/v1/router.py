"""Aggregates every v1 router; `app.py` mounts it under `/api/v1`."""

from fastapi import APIRouter

from ffe.api.v1 import (
    budget,
    capture,
    category,
    choice,
    client,
    export,
    file,
    health,
    installation_plan,
    installation_sheet,
    listing_profile,
    location,
    professional,
    project,
    project_item,
    setting,
    supplier,
    system,
)

router = APIRouter()
router.include_router(health.router)
router.include_router(client.router)
router.include_router(supplier.router)
router.include_router(professional.router)
router.include_router(category.router)
router.include_router(choice.router)
router.include_router(file.router)
router.include_router(project.router)
router.include_router(location.router)
router.include_router(project_item.router)
router.include_router(budget.router)
router.include_router(export.router)
router.include_router(capture.router)
router.include_router(setting.router)
router.include_router(listing_profile.router)
router.include_router(installation_plan.router)
router.include_router(installation_sheet.router)
router.include_router(system.router)
