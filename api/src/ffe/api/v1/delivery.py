"""Receipts of a purchase order (API.md « Réceptions »)."""

from typing import Annotated

from fastapi import APIRouter, Path

from ffe.deps import DepsDep, SessionDep
from ffe.schemas.delivery import DeliveryCreate, DeliveryRead
from ffe.schemas.purchase_order import PoRead
from ffe.services import delivery as service
from ffe.services import purchase_order as po_service

router = APIRouter(tags=["deliveries"])

PoId = Annotated[int, Path(ge=1)]
DeliveryId = Annotated[int, Path(ge=1)]


@router.get("/purchase-orders/{po_id}/deliveries", operation_id="listDeliveries")
def list_deliveries(po_id: PoId, session: SessionDep) -> list[DeliveryRead]:
    po_service.get_po(session, po_id)
    return [service.to_read(session, d) for d in service.list_deliveries(session, po_id)]


@router.post("/purchase-orders/{po_id}/deliveries", status_code=201, operation_id="createDelivery")
def create_delivery(
    po_id: PoId, payload: DeliveryCreate, session: SessionDep, deps: DepsDep
) -> DeliveryRead:
    return service.to_read(session, service.create_delivery(session, po_id, payload, deps.clock))


@router.delete("/deliveries/{delivery_id}", operation_id="deleteDelivery")
def delete_delivery(delivery_id: DeliveryId, session: SessionDep, deps: DepsDep) -> PoRead:
    return po_service.to_read(session, service.delete_delivery(session, delivery_id, deps.clock))
