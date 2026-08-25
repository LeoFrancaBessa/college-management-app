from pydantic import BaseModel
from app.schemas.item import ItemRead

class AIInterpretRequest(BaseModel):
    text: str

class AIInterpretResponse(BaseModel):
    understood: bool
    message: str
    created_items: list[ItemRead] = []
    updated_items: list[ItemRead] = []
    deleted_item_ids: list[int] = []
