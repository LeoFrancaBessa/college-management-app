from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ItemStatus
from app.schemas.board import BoardRead
from app.schemas.item_type import ItemTypeRead
from app.schemas.tag import TagRead


class ItemCreate(BaseModel):
    title: str
    item_type_id: int
    due_date: datetime | None = None
    # Required for a top-level item; ignored (derived from the parent) when
    # parent_id is set — see business rule 1 in 00-constituicao.md.
    course_id: int | None = None
    parent_id: int | None = None
    board_column_id: int | None = None
    tag_ids: list[int] = []
    features: dict = {}


class ItemUpdate(BaseModel):
    title: str | None = None
    item_type_id: int | None = None
    due_date: datetime | None = None
    features: dict | None = None


class ItemMove(BaseModel):
    parent_id: int | None = None


class ItemBoardColumnUpdate(BaseModel):
    board_column_id: int | None = None


class ItemTagsUpdate(BaseModel):
    tag_ids: list[int]


class ItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    due_date: datetime | None
    status: ItemStatus
    course_id: int
    parent_id: int | None
    board_column_id: int | None
    features: dict
    created_at: datetime
    updated_at: datetime

    item_type: ItemTypeRead
    tags: list[TagRead] = []
    board: BoardRead | None = None
