"""SQLAlchemy models, one module per table. Import every model here so `Base.metadata` is complete."""

from ffe.models.base import Base
from ffe.models.category import Category
from ffe.models.client import Client
from ffe.models.file import File
from ffe.models.manufacturer import Manufacturer
from ffe.models.product import Product
from ffe.models.product_file import ProductFile
from ffe.models.setting import Setting
from ffe.models.supplier import Supplier

__all__ = [
    "Base",
    "Category",
    "Client",
    "File",
    "Manufacturer",
    "Product",
    "ProductFile",
    "Setting",
    "Supplier",
]
