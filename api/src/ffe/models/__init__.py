"""SQLAlchemy models, one module per table. Import every model here so `Base.metadata` is complete."""

from ffe.models.base import Base
from ffe.models.client import Client
from ffe.models.setting import Setting

__all__ = ["Base", "Client", "Setting"]
