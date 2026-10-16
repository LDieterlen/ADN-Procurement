"""`installation_sheet` service (ADR-0024): the parts of a room shown on installation pages, each
with its plan and the ordered placements drawn round it. A placement may be on several sheets;
the room's placements on none are pointed out."""

from typing import cast

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.errors import ErrorDetail, NotFoundError, ValidationAppError
from ffe.exports.prescription import main_photo
from ffe.i18n import fr
from ffe.installation import ARRANGEMENTS, NO_TYPE_COLOR, PER_PAGE, TYPE_COLORS
from ffe.installation import layout as grid_layout
from ffe.models import (
    Category,
    InstallationPlan,
    InstallationSheet,
    InstallationSheetItem,
    InstallationSheetMarker,
    Location,
    ProjectItem,
    ProjectItemPlacement,
)
from ffe.schemas.installation_sheet import (
    Arrangement,
    InstallationArticle,
    InstallationLayout,
    InstallationMarker,
    InstallationPlanBox,
    InstallationSheetCreate,
    InstallationSheetDetail,
    InstallationSheetItemsSet,
    InstallationSheetRead,
    InstallationSheetUpdate,
    InstallationSlot,
    Rotation,
)
from ffe.services.base import stamp
from ffe.services.project import ensure_open, get_project

RESOURCE = "installation_sheet"


def list_sheets(session: Session, project_id: int) -> list[InstallationSheet]:
    get_project(session, project_id)
    query = (
        select(InstallationSheet)
        .where(InstallationSheet.project_id == project_id)
        .order_by(InstallationSheet.sort_order, InstallationSheet.id)
    )
    return list(session.scalars(query))


def get_sheet(session: Session, sheet_id: int) -> InstallationSheet:
    sheet = session.get(InstallationSheet, sheet_id)
    if sheet is None:
        raise NotFoundError(RESOURCE, sheet_id)
    return sheet


def page_count(sheet: InstallationSheet) -> int:
    """At least one page (the plan alone), then one more per `per_page` cells (empty ones too)."""
    cells = max((row.position for row in sheet.items), default=-1) + 1
    return max(1, -(-cells // sheet.per_page))


def to_read(sheet: InstallationSheet) -> InstallationSheetRead:
    return InstallationSheetRead(
        id=sheet.id,
        project_id=sheet.project_id,
        location_id=sheet.location_id,
        plan_id=sheet.plan_id,
        name=sheet.name,
        per_page=sheet.per_page,
        arrangement=cast(Arrangement, sheet.arrangement),
        plan_rotation=cast(Rotation, sheet.plan_rotation),
        color_by_type=bool(sheet.color_by_type),
        sort_order=sheet.sort_order,
        item_count=len(sheet.items),
        page_count=page_count(sheet),
        created_at=sheet.created_at,
        updated_at=sheet.updated_at,
    )


def _check_location(session: Session, project_id: int, location_id: int) -> None:
    location = session.get(Location, location_id)
    if location is None or location.project_id != project_id:
        raise ValidationAppError([ErrorDetail("locationId", fr.SHEET_REFERENCE_UNKNOWN)])


def _check_plan(session: Session, project_id: int, plan_id: int | None) -> None:
    if plan_id is None:
        return
    plan = session.get(InstallationPlan, plan_id)
    if plan is None or plan.project_id != project_id:
        raise ValidationAppError([ErrorDetail("planId", fr.SHEET_REFERENCE_UNKNOWN)])


def create_sheet(
    session: Session, project_id: int, data: InstallationSheetCreate, clock: Clock
) -> InstallationSheet:
    with session.begin():
        ensure_open(get_project(session, project_id))
        _check_location(session, project_id, data.location_id)
        _check_plan(session, project_id, data.plan_id)
        last = session.scalar(
            select(func.max(InstallationSheet.sort_order)).where(
                InstallationSheet.project_id == project_id
            )
        )
        now = stamp(clock)
        sheet = InstallationSheet(
            project_id=project_id,
            location_id=data.location_id,
            plan_id=data.plan_id,
            name=data.name,
            per_page=data.per_page,
            arrangement=data.arrangement,
            plan_rotation=data.plan_rotation,
            color_by_type=int(data.color_by_type),
            sort_order=(last or 0) + 10,
            created_at=now,
            updated_at=now,
        )
        session.add(sheet)
    return sheet


def update_sheet(
    session: Session, sheet_id: int, data: InstallationSheetUpdate, clock: Clock
) -> InstallationSheet:
    with session.begin():
        sheet = get_sheet(session, sheet_id)
        ensure_open(get_project(session, sheet.project_id))
        changes = data.model_dump(exclude_unset=True)
        if "plan_id" in changes:
            _check_plan(session, sheet.project_id, changes["plan_id"])
        if "color_by_type" in changes:
            changes["color_by_type"] = int(changes["color_by_type"])
        for field_name, value in changes.items():
            setattr(sheet, field_name, value)
        sheet.updated_at = stamp(clock)
    return sheet


def delete_sheet(session: Session, sheet_id: int) -> None:
    with session.begin():
        sheet = get_sheet(session, sheet_id)
        ensure_open(get_project(session, sheet.project_id))
        session.delete(sheet)


def _room_placements(session: Session, sheet: InstallationSheet) -> list[ProjectItemPlacement]:
    """The placements of the sheet's room whose article is still to be installed."""
    query = (
        select(ProjectItemPlacement)
        .join(ProjectItem, ProjectItem.id == ProjectItemPlacement.project_item_id)
        .where(
            ProjectItemPlacement.location_id == sheet.location_id,
            ProjectItem.kind == "product",
            ProjectItem.status != "cancelled",
        )
        .order_by(ProjectItemPlacement.code)
    )
    return list(session.scalars(query))


def set_items(
    session: Session, sheet_id: int, data: InstallationSheetItemsSet, clock: Clock
) -> InstallationSheet:
    """Replaces the cells: each entry an article and its dots on the plan, or None (a cell left
    empty; the empty cells at the end are dropped). A placement must be in the room, or already
    on the sheet (one moved away since is kept until it is taken off)."""
    with session.begin():
        sheet = get_sheet(session, sheet_id)
        ensure_open(get_project(session, sheet.project_id))
        cells = list(data.cells)
        while cells and cells[-1] is None:
            cells.pop()
        wanted = [cell.placement_id for cell in cells if cell is not None]
        if len(set(wanted)) != len(wanted):
            raise ValidationAppError([ErrorDetail("cells", fr.SHEET_PLACEMENT_REPEATED)])
        current = {row.placement_id: row for row in sheet.items}
        allowed = {p.id for p in _room_placements(session, sheet)} | set(current)
        for placement_id in wanted:
            if placement_id not in allowed:
                placement = session.get(ProjectItemPlacement, placement_id)
                if placement is None or placement.project_id != sheet.project_id:
                    raise ValidationAppError([ErrorDetail("cells", fr.SHEET_REFERENCE_UNKNOWN)])
                item = session.get(ProjectItem, placement.project_item_id)
                if placement.location_id == sheet.location_id and item is not None:
                    message = fr.SHEET_PLACEMENT_NOT_INSTALLED.format(code=placement.code)
                else:
                    message = fr.SHEET_PLACEMENT_OUT_OF_ROOM.format(code=placement.code)
                raise ValidationAppError([ErrorDetail("cells", message)])
        # Kept rows are updated in place: a delete then insert of the same placement would
        # collide on the UNIQUE (sheet, placement) inside one flush.
        for placement_id, row in current.items():
            if placement_id not in wanted:
                sheet.items.remove(row)
        for position, cell in enumerate(cells):
            if cell is None:
                continue
            row = current.get(cell.placement_id)
            if row is None:
                row = InstallationSheetItem(placement_id=cell.placement_id, position=position)
                sheet.items.append(row)
            row.position = position
            row.markers = [
                InstallationSheetMarker(x_permille=m.x, y_permille=m.y) for m in cell.markers
            ]
        sheet.updated_at = stamp(clock)
    session.expire(sheet, ["items"])
    return sheet


def type_colors(session: Session, project_id: int) -> dict[int, str]:
    """Product type → its colour on this project's sheets: the types of its articles, in the
    order of the types, take the palette in turn (the same colour on every sheet)."""
    used = select(ProjectItem.category_id).where(
        ProjectItem.project_id == project_id, ProjectItem.category_id.is_not(None)
    )
    query = (
        select(Category.id).where(Category.id.in_(used)).order_by(Category.sort_order, Category.id)
    )
    return {
        category_id: TYPE_COLORS[i % len(TYPE_COLORS)]
        for i, category_id in enumerate(session.scalars(query))
    }


def articles(
    session: Session, sheet: InstallationSheet
) -> tuple[list[InstallationArticle | None], list[InstallationArticle]]:
    """(the sheet's cells in order, None for an empty one; the room's other placements by code)."""
    shown_on: dict[int, list[tuple[int, str]]] = {}
    query = (
        select(InstallationSheetItem.placement_id, InstallationSheet.id, InstallationSheet.name)
        .join(InstallationSheet, InstallationSheet.id == InstallationSheetItem.sheet_id)
        .where(InstallationSheet.project_id == sheet.project_id)
        .order_by(InstallationSheet.sort_order, InstallationSheet.id)
    )
    for placement_id, other_id, other_name in session.execute(query):
        shown_on.setdefault(placement_id, []).append((other_id, other_name))
    categories = {c.id: c.name for c in session.scalars(select(Category))}
    colors = type_colors(session, sheet.project_id)

    def article(
        placement: ProjectItemPlacement, row: InstallationSheetItem | None = None
    ) -> InstallationArticle:
        item = session.get(ProjectItem, placement.project_item_id)
        assert item is not None
        photo = main_photo(item)
        return InstallationArticle(
            placement_id=placement.id,
            item_id=item.id,
            code=placement.code,
            name=item.name,
            type_name=categories.get(item.category_id) if item.category_id else None,
            qty_milli=placement.qty_milli,
            photo_file_id=photo.file_id if photo else None,
            color=colors.get(item.category_id or 0, NO_TYPE_COLOR),
            markers=[InstallationMarker(x=m.x_permille, y=m.y_permille) for m in row.markers]
            if row
            else [],
            other_sheets=[name for i, name in shown_on.get(placement.id, []) if i != sheet.id],
            out_of_room=placement.location_id != sheet.location_id,
        )

    cells = max((row.position for row in sheet.items), default=-1) + 1
    items: list[InstallationArticle | None] = [None] * cells
    for row in sheet.items:
        placement = session.get(ProjectItemPlacement, row.placement_id)
        assert placement is not None
        items[row.position] = article(placement, row)
    on_sheet = {row.placement_id for row in sheet.items}
    candidates = [article(p) for p in _room_placements(session, sheet) if p.id not in on_sheet]
    return items, candidates


def layout(arrangement: Arrangement, per_page: int) -> InstallationLayout:
    grid = grid_layout(arrangement, per_page)
    row, col, rows, cols = grid.plan
    return InstallationLayout(
        arrangement=arrangement,
        per_page=per_page,
        col_widths=grid.col_widths,
        row_heights=grid.row_heights,
        plan=InstallationPlanBox(row=row, col=col, rows=rows, cols=cols),
        slots=[InstallationSlot(row=r, col=c) for r, c in grid.slots],
    )


def detail(session: Session, sheet_id: int) -> InstallationSheetDetail:
    with session.begin():
        sheet = get_sheet(session, sheet_id)
        items, candidates = articles(session, sheet)
        return InstallationSheetDetail(
            **to_read(sheet).model_dump(),
            items=items,
            candidates=candidates,
            layouts=[layout(a, n) for a in ARRANGEMENTS for n in PER_PAGE],
        )
