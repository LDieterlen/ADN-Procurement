"""SQLAlchemy models, one module per table. Import every model here so `Base.metadata` is complete."""

from ffe.models.base import Base
from ffe.models.budget_line import BudgetLine
from ffe.models.capture import Capture, CaptureImage
from ffe.models.category import Category
from ffe.models.choice import Choice
from ffe.models.client import Client
from ffe.models.file import File
from ffe.models.item_code_sequence import ItemCodeSequence
from ffe.models.location import Location
from ffe.models.professional import Professional
from ffe.models.project import Project
from ffe.models.project_file import ProjectFile
from ffe.models.project_indice import ProjectIndice
from ffe.models.project_item import ProjectItem
from ffe.models.project_item_event import ProjectItemEvent
from ffe.models.project_item_file import ProjectItemFile
from ffe.models.project_item_placement import ProjectItemPlacement
from ffe.models.setting import Setting
from ffe.models.supplier import Supplier

__all__ = [
    "Base",
    "BudgetLine",
    "Capture",
    "CaptureImage",
    "Category",
    "Choice",
    "Client",
    "File",
    "ItemCodeSequence",
    "Location",
    "Professional",
    "Project",
    "ProjectFile",
    "ProjectIndice",
    "ProjectItem",
    "ProjectItemEvent",
    "ProjectItemFile",
    "ProjectItemPlacement",
    "Setting",
    "Supplier",
]
