from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AttachmentRead(BaseModel):
    """RF-19 — metadata for a stored attachment."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    original_filename: str
    stored_filename: str
    content_type: str
    size: int
    path: str
    created_at: datetime
