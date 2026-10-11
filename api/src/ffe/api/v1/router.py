"""Aggregates every v1 router; `app.py` mounts it under `/api/v1`."""

from fastapi import APIRouter

from ffe.api.v1 import (
    budget,
    category,
    client,
    delivery,
    export,
    file,
    health,
    manufacturer,
    product,
    project,
    project_item,
    purchase_order,
    quote,
    setting,
    supplier,
    supplier_invoice,
    system,
    zone,
)

router = APIRouter()
router.include_router(health.router)
router.include_router(client.router)
router.include_router(supplier.router)
router.include_router(manufacturer.router)
router.include_router(category.router)
router.include_router(product.router)
router.include_router(file.router)
router.include_router(project.router)
router.include_router(zone.router)
router.include_router(project_item.router)
router.include_router(budget.router)
router.include_router(quote.router)
router.include_router(purchase_order.router)
router.include_router(delivery.router)
router.include_router(supplier_invoice.router)
router.include_router(export.router)
router.include_router(setting.router)
router.include_router(system.router)
