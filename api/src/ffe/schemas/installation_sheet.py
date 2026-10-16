"""`installation_sheet` schemas (ADR-0024): a part of a room, its plan and the articles round it."""

from typing import Annotated, Any, Literal

from pydantic import Field, field_validator

from ffe.i18n import fr
from ffe.schemas.base import BaseSchema, strip_text

Name = Annotated[str, Field(min_length=1, max_length=100)]
PerPage = Literal[8, 12, 16]
Arrangement = Literal["ring", "sides", "ends", "right"]  # `ffe.installation.ARRANGEMENTS`
Rotation = Literal[0, 90, 180, 270]


class InstallationSheetCreate(BaseSchema):
    location_id: Annotated[int, Field(ge=1)]
    name: Name
    plan_id: Annotated[int, Field(ge=1)] | None = None
    per_page: PerPage = 12
    arrangement: Arrangement = "ring"
    plan_rotation: Rotation = 0
    color_by_type: bool = False

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return strip_text(value)


class InstallationSheetUpdate(BaseSchema):
    name: Name | None = None
    plan_id: Annotated[int, Field(ge=1)] | None = None  # null = no plan
    per_page: PerPage | None = None
    arrangement: Arrangement | None = None
    plan_rotation: Rotation | None = None
    color_by_type: bool | None = None

    @field_validator(
        "name", "per_page", "arrangement", "plan_rotation", "color_by_type",
        mode="before",
    )  # fmt: skip
    @classmethod
    def required_fields_cannot_be_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError(fr.FIELD_REQUIRED)
        return strip_text(value)


Permille = Annotated[int, Field(ge=0, le=1000)]
MAX_CELLS = 16 * 50  # 50 pages of the largest size: far beyond a room, never a runaway render


class InstallationMarker(BaseSchema):
    """A numbered dot on the plan, in thousandths of the plan as stored (before any rotation)."""

    x: Permille
    y: Permille


class InstallationCellIn(BaseSchema):
    placement_id: Annotated[int, Field(ge=1)]
    markers: Annotated[list[InstallationMarker], Field(max_length=50)] = []


class InstallationSheetItemsSet(BaseSchema):
    """The sheet's cells in order, saved at once: an article and its dots on the plan, or null
    for a cell left empty."""

    cells: Annotated[list[InstallationCellIn | None], Field(max_length=MAX_CELLS)]


class InstallationSheetRead(BaseSchema):
    id: int
    project_id: int
    location_id: int
    plan_id: int | None
    name: str
    per_page: int
    arrangement: Arrangement
    plan_rotation: Rotation
    color_by_type: bool
    sort_order: int
    item_count: int
    page_count: int
    created_at: str
    updated_at: str


class InstallationArticle(BaseSchema):
    """A placement as the sheet shows it: its code, its article and its photo."""

    placement_id: int
    item_id: int
    code: str
    name: str
    type_name: str | None
    qty_milli: int
    photo_file_id: int | None
    color: str  # its type's colour, shown when the sheet is in colour
    markers: list[InstallationMarker]  # its dots on this sheet's plan ([] for a candidate)
    other_sheets: list[str]  # names of the other sheets of the project showing it
    out_of_room: bool  # moved to another room since it was put on the sheet


class InstallationSlot(BaseSchema):
    row: int
    col: int


class InstallationPlanBox(BaseSchema):
    row: int
    col: int
    rows: int
    cols: int


class InstallationLayout(BaseSchema):
    """A page's grid (`ffe.installation.layout`): column widths and row heights in px of the A3
    page, the block the plan spans, the article cells in reading order."""

    arrangement: Arrangement
    per_page: int
    col_widths: list[int]
    row_heights: list[int]
    plan: InstallationPlanBox
    slots: list[InstallationSlot]


class InstallationSheetDetail(InstallationSheetRead):
    items: list[InstallationArticle | None]  # cell by cell; null = a cell left empty
    # The room's placements not on this sheet; those on no sheet at all have `other_sheets` [].
    candidates: list[InstallationArticle]
    layouts: list[InstallationLayout]  # every arrangement and size: the draft may change them
