from pathlib import Path

from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.board import Board, BoardColumn
from app.models.course import Course
from app.models.enums import ItemStatus
from app.models.item import Item
from app.models.item_type import ItemType
from app.models.tag import Tag
from app.schemas.item import ItemCreate, ItemMove, ItemUpdate
from app.services.board_service import build_default_board
from app.services.errors import NotFoundError, ValidationError
from app.services.recurrence import validate_recurrence


def _get_item_type_or_404(db: Session, item_type_id: int) -> ItemType:
    item_type = db.get(ItemType, item_type_id)
    if item_type is None:
        raise NotFoundError(f"ItemType {item_type_id} not found")
    return item_type


def _get_course_or_404(db: Session, course_id: int) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise NotFoundError(f"Course {course_id} not found")
    return course


def _get_tags_or_404(db: Session, tag_ids: list[int]) -> list[Tag]:
    if not tag_ids:
        return []
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    if len(tags) != len(set(tag_ids)):
        raise NotFoundError("one or more tag_ids not found")
    return tags


def _resolve_owner_board(db: Session, course_id: int, parent: Item | None) -> Board | None:
    if parent is not None:
        return parent.board
    return _get_course_or_404(db, course_id).board


def _validate_board_column(
    db: Session, board_column_id: int, course_id: int, parent: Item | None
) -> int:
    column = db.get(BoardColumn, board_column_id)
    if column is None:
        raise NotFoundError(f"BoardColumn {board_column_id} not found")
    owner_board = _resolve_owner_board(db, course_id, parent)
    if owner_board is None or column.board_id != owner_board.id:
        raise ValidationError("board_column_id does not belong to the item's board")
    return column.id


def create_item(db: Session, data: ItemCreate) -> Item:
    item_type = _get_item_type_or_404(db, data.item_type_id)

    parent = None
    if data.parent_id is not None:
        # A child item always inherits its course from the parent — see
        # business rule 1 in 00-constituicao.md.
        parent = get_item(db, data.parent_id)
        course_id = parent.course_id
    else:
        if data.course_id is None:
            raise ValidationError("course_id is required for a top-level item")
        course_id = _get_course_or_404(db, data.course_id).id

    tags = _get_tags_or_404(db, data.tag_ids)

    features = dict(data.features or {})
    if "recurrence" in features:
        # validate_recurrence normaliza em-place e exige due_date
        validate_recurrence(features, data.due_date)

    item = Item(
        title=data.title,
        item_type_id=item_type.id,
        due_date=data.due_date,
        course_id=course_id,
        parent_id=data.parent_id,
        features=features,
        tags=tags,
    )

    if data.board_column_id is not None:
        item.board_column_id = _validate_board_column(
            db, data.board_column_id, course_id, parent
        )

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_items(
    db: Session,
    course_id: int | None = None,
    parent_id: int | None = None,
    top_level_only: bool = False,
) -> list[Item]:
    query = db.query(Item)
    if course_id is not None:
        query = query.filter(Item.course_id == course_id)
    if top_level_only:
        query = query.filter(Item.parent_id.is_(None))
    elif parent_id is not None:
        query = query.filter(Item.parent_id == parent_id)
    return query.order_by(Item.created_at.desc()).all()


def get_item(db: Session, item_id: int) -> Item:
    item = db.get(Item, item_id)
    if item is None:
        raise NotFoundError(f"Item {item_id} not found")
    return item


def update_item(db: Session, item: Item, data: ItemUpdate) -> Item:
    updates = data.model_dump(exclude_unset=True)
    if "item_type_id" in updates:
        _get_item_type_or_404(db, updates["item_type_id"])
    # RF-20: validate recurrence whenever features or due_date changes
    if "features" in updates or "due_date" in updates:
        raw_features = updates.get("features") if "features" in updates else item.features
        # PATCH with features=None means "clear" — treat as empty
        if raw_features is None:
            effective_features: dict | None = {}
        elif isinstance(raw_features, dict):
            effective_features = dict(raw_features)
        else:
            effective_features = raw_features  # let validator reject type
        effective_due = updates.get("due_date") if "due_date" in updates else item.due_date
        # If due_date is being cleared while recurrence is active -> error
        # validate_recurrence will raise the same, but we pass the effective state
        if effective_features is not None and isinstance(effective_features, dict) and "recurrence" in effective_features:
            validate_recurrence(effective_features, effective_due)
            # persist normalized form when features was part of the patch
            if "features" in updates:
                updates["features"] = effective_features
        elif effective_due is None and isinstance(item.features, dict) and "recurrence" in (item.features or {}):
            # due_date cleared but recurrence not removed: must fail when
            # features wasn't touched. Re-validate existing recurrence.
            tmp = dict(item.features)
            validate_recurrence(tmp, effective_due)
        elif "due_date" in updates and isinstance(item.features, dict) and "recurrence" in (item.features or {}):
            # due_date changed but recurrence untouched — re-validate against new anchor
            tmp = dict(item.features)
            validate_recurrence(tmp, effective_due)
            # also normalize stored features if needed (e.g. until rewritten)
            # keep original features unless validation mutated it (until ISO)
            if tmp != item.features:
                item.features = tmp
    for field, value in updates.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def archive_item(db: Session, item: Item) -> Item:
    item.status = ItemStatus.ARCHIVED
    db.commit()
    db.refresh(item)
    return item


def _collect_item_subtree_ids(db: Session, root_id: int) -> list[int]:
    ids = [root_id]
    queue = [root_id]
    while queue:
        cur = queue.pop()
        for (cid,) in db.query(Item.id).filter(Item.parent_id == cur).all():
            ids.append(cid)
            queue.append(cid)
    return ids


def delete_item(db: Session, item: Item) -> None:
    # Manual deletion is always direct (never trash) — business rule 5 only
    # applies to AI-driven deletion. Cascades to child items and its own board.
    # Collect attachment file paths before DB cascade deletes the rows (via
    # explicit query — does not rely on relationships being loaded).
    paths: list[str] = []
    try:
        subtree_ids = _collect_item_subtree_ids(db, item.id)
        paths = [r[0] for r in db.query(Attachment.path).filter(Attachment.item_id.in_(subtree_ids)).all()]
    except Exception:
        pass
    db.delete(item)
    db.commit()
    for p in paths:
        try:
            Path(p).unlink(missing_ok=True)
        except Exception:
            pass


def _is_within_subtree(root: Item, candidate_id: int) -> bool:
    """Whether `candidate_id` is `root` itself or lives anywhere in its subtree."""
    if root.id == candidate_id:
        return True
    return any(_is_within_subtree(child, candidate_id) for child in root.children)


def _cascade_course_id(item: Item, course_id: int) -> None:
    item.course_id = course_id
    for child in item.children:
        _cascade_course_id(child, course_id)


def move_item(db: Session, item: Item, data: ItemMove) -> Item:
    new_parent = None
    if data.parent_id is not None:
        new_parent = get_item(db, data.parent_id)
        if _is_within_subtree(item, new_parent.id):
            raise ValidationError(
                "cannot move an item under itself or one of its own descendants"
            )

    item.parent_id = new_parent.id if new_parent is not None else None

    new_course_id = new_parent.course_id if new_parent is not None else item.course_id
    if new_course_id != item.course_id:
        _cascade_course_id(item, new_course_id)

    db.commit()
    db.refresh(item)
    return item


def set_board_column(db: Session, item: Item, board_column_id: int | None) -> Item:
    if board_column_id is not None:
        item.board_column_id = _validate_board_column(
            db, board_column_id, item.course_id, item.parent
        )
    else:
        item.board_column_id = None
    db.commit()
    db.refresh(item)
    return item


def add_tags(db: Session, item: Item, tag_ids: list[int]) -> Item:
    for tag in _get_tags_or_404(db, tag_ids):
        if tag not in item.tags:
            item.tags.append(tag)
    db.commit()
    db.refresh(item)
    return item


def remove_tag(db: Session, item: Item, tag_id: int) -> Item:
    item.tags = [tag for tag in item.tags if tag.id != tag_id]
    db.commit()
    db.refresh(item)
    return item


def enable_board(db: Session, item: Item) -> Board:
    """Activates the Board feature on an item, to organize its child items
    (RF-26) — opt-in, per business rule 3."""
    if item.board is not None:
        raise ValidationError("this item already has a board")
    board = build_default_board(item=item)
    db.add(board)  # explicit add — see the comment in course_service.create_course
    db.commit()
    db.refresh(board)
    return board
