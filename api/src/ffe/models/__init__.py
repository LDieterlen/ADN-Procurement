"""SQLAlchemy models, one module per table. Import every model here so `Base.metadata` is complete."""

from ffe.models.base import Base
from ffe.models.budget_line import BudgetLine
from ffe.models.category import Category
from ffe.models.client import Client
from ffe.models.delivery import Delivery
from ffe.models.delivery_line import DeliveryLine
from ffe.models.file import File
from ffe.models.import_batch import ImportBatch
from ffe.models.item_code_sequence import ItemCodeSequence
from ffe.models.manufacturer import Manufacturer
from ffe.models.po_sequence import PoSequence
from ffe.models.price_observation import PriceObservation
from ffe.models.product import Product
from ffe.models.product_file import ProductFile
from ffe.models.project import Project
from ffe.models.project_file import ProjectFile
from ffe.models.project_item import ProjectItem
from ffe.models.project_item_event import ProjectItemEvent
from ffe.models.project_item_file import ProjectItemFile
from ffe.models.project_item_placement import ProjectItemPlacement
from ffe.models.purchase_order import PurchaseOrder
from ffe.models.purchase_order_file import PurchaseOrderFile
from ffe.models.purchase_order_line import PurchaseOrderLine
from ffe.models.quote import Quote
from ffe.models.quote_file import QuoteFile
from ffe.models.quote_line import QuoteLine
from ffe.models.setting import Setting
from ffe.models.supplier import Supplier
from ffe.models.supplier_invoice import SupplierInvoice
from ffe.models.zone import Zone

__all__ = [
    "Base",
    "BudgetLine",
    "Category",
    "Client",
    "Delivery",
    "DeliveryLine",
    "File",
    "ImportBatch",
    "ItemCodeSequence",
    "Manufacturer",
    "Product",
    "ProductFile",
    "Project",
    "ProjectFile",
    "ProjectItem",
    "ProjectItemEvent",
    "ProjectItemFile",
    "PoSequence",
    "PriceObservation",
    "ProjectItemPlacement",
    "PurchaseOrder",
    "PurchaseOrderFile",
    "PurchaseOrderLine",
    "Quote",
    "QuoteFile",
    "QuoteLine",
    "Setting",
    "Supplier",
    "SupplierInvoice",
    "Zone",
]
