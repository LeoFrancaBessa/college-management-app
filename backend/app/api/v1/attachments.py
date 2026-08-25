"""RF-19 — Attachment endpoints.

- POST   /api/v1/items/{item_id}/attachments — upload multipart (20 MB, any type)
- GET    /api/v1/items/{item_id}/attachments — list by item
- GET    /api/v1/attachments/{attachment_id} — download (FileResponse streaming)
- DELETE /api/v1/attachments/{attachment_id} — delete metadata + file

All routes require auth (router-level dependency).
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.attachment import AttachmentRead
from app.services import attachment_service
from app.services.errors import ValidationError

router = APIRouter(
    tags=["attachments"], dependencies=[Depends(get_current_user)]
)


@router.post(
    "/items/{item_id}/attachments",
    response_model=AttachmentRead,
    status_code=201,
    summary="RF-19 — upload de anexo para um item",
)
async def upload_attachment(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file is None or file.filename is None:
        raise ValidationError("file is required")
    return await attachment_service.create_attachment(db, item_id, file)


@router.get(
    "/items/{item_id}/attachments",
    response_model=list[AttachmentRead],
    summary="RF-19 — lista anexos de um item",
)
def list_attachments(item_id: int, db: Session = Depends(get_db)):
    return attachment_service.list_attachments(db, item_id)


@router.get(
    "/attachments/{attachment_id}",
    summary="RF-19 — download de anexo (streaming)",
)
def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = attachment_service.get_attachment(db, attachment_id)
    path = Path(att.path)
    if not path.exists():
        # metadata exists but file missing on disk — stale state
        raise ValidationError(f"file for attachment {attachment_id} not found on disk")
    return FileResponse(
        path=str(path),
        media_type=att.content_type,
        filename=att.original_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{att.original_filename}"'
        },
    )


@router.delete(
    "/attachments/{attachment_id}",
    status_code=204,
    summary="RF-19 — remove anexo",
)
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment_service.delete_attachment(db, attachment_id)
