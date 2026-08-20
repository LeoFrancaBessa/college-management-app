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


class BoardLayoutUpdate(BaseModel):
    layout: BoardLayout


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    layout: BoardLayout
    columns: list[BoardColumnRead] = []
