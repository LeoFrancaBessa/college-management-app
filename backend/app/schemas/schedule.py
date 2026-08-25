from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ItemStatus
from app.schemas.item_type import ItemTypeRead
from app.schemas.tag import TagRead


class ScheduleItemRead(BaseModel):
    """Item as returned by the schedule/homepage — reuses Item fields
    but kept as a dedicated schema so schedule evolution doesn't break Item.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    due_date: datetime
    status: ItemStatus
    course_id: int
    parent_id: int | None
    features: dict
    created_at: datetime
    updated_at: datetime
    item_type: ItemTypeRead
    tags: list[TagRead] = []
