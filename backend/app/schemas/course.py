from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ActiveArchivedStatus
from app.schemas.board import BoardRead


class CourseBase(BaseModel):
    name: str
    description: str | None = None


class CourseCreate(CourseBase):
    period_id: int


class CourseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CourseRead(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period_id: int
    status: ActiveArchivedStatus
    created_at: datetime
    board: BoardRead | None = None
