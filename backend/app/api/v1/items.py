from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import ItemStatus
from app.schemas.board import BoardRead
from app.schemas.item import (
    ItemBoardColumnUpdate,
    ItemCreate,
    ItemMove,
    ItemRead,
    ItemTagsUpdate,
    ItemUpdate,
)
from app.services import item_service

router = APIRouter(
    prefix="/items", tags=["items"], dependencies=[Depends(get_current_user)]
)


@router.post("", response_model=ItemRead, status_code=201)
def create_item(data: ItemCreate, db: Session = Depends(get_db)):
    return item_service.create_item(db, data)


@router.get("", response_model=list[ItemRead])
def list_items(
    course_id: int | None = None,
    parent_id: int | None = None,
    top_level_only: bool = False,
    status: ItemStatus | None = Query(None, description="Filter by status (active|archived|trash)"),
    include_archived: bool = Query(False, description="When true, includes ARCHIVED alongside ACTIVE"),
    include_trash: bool = Query(False, description="When true, includes TRASH (normally via GET /trash)"),
    limit: int | None = Query(None, ge=1, le=100, description="Max items to return"),
    offset: int | None = Query(None, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    return item_service.list_items(
        db,
        course_id=course_id,
        parent_id=parent_id,
        top_level_only=top_level_only,
        status=status,
        include_archived=include_archived,
        include_trash=include_trash,
        limit=limit,
        offset=offset,
    )


@router.get("/{item_id}", response_model=ItemRead)
def get_item(item_id: int, db: Session = Depends(get_db)):
    return item_service.get_item(db, item_id)


@router.patch("/{item_id}", response_model=ItemRead)
def update_item(item_id: int, data: ItemUpdate, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    return item_service.update_item(db, item, data)


@router.post("/{item_id}/archive", response_model=ItemRead)
def archive_item(item_id: int, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    return item_service.archive_item(db, item)


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    item_service.delete_item(db, item)


@router.post("/{item_id}/move", response_model=ItemRead)
def move_item(item_id: int, data: ItemMove, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    return item_service.move_item(db, item, data)


@router.put("/{item_id}/board-column", response_model=ItemRead)
def set_board_column(
    item_id: int, data: ItemBoardColumnUpdate, db: Session = Depends(get_db)
):
    item = item_service.get_item(db, item_id)
    return item_service.set_board_column(db, item, data.board_column_id)


@router.put("/{item_id}/tags", response_model=ItemRead)
def set_tags(item_id: int, data: ItemTagsUpdate, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    return item_service.add_tags(db, item, data.tag_ids)


@router.delete("/{item_id}/tags/{tag_id}", response_model=ItemRead)
def remove_tag(item_id: int, tag_id: int, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    return item_service.remove_tag(db, item, tag_id)


@router.post("/{item_id}/board", response_model=BoardRead, status_code=201)
def enable_board(item_id: int, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    return item_service.enable_board(db, item)


@router.delete("/{item_id}/board", status_code=204)
def disable_board(item_id: int, db: Session = Depends(get_db)):
    item = item_service.get_item(db, item_id)
    item_service.disable_board(db, item)
