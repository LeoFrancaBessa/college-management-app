from pydantic import BaseModel, ConfigDict


class ItemTypeCreate(BaseModel):
    name: str


class ItemTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
