from pydantic import BaseModel, ConfigDict

from app.models.enums import BoardLayout


class BoardColumnCreate(BaseModel):
    name: str
    position: int | None = None


class BoardColumnUpdate(BaseModel):
    name: str | None = None
    position: int | None = None


class BoardColumnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    position: int
    is_system: bool


class BoardLayoutUpdate(BaseModel):
    layout: BoardLayout


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int | None = None
    item_id: int | None = None
    layout: BoardLayout
    columns: list[BoardColumnRead] = []
