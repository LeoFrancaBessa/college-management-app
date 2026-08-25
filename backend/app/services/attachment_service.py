"""RF-19 — Attachment service (disk + metadata).

Files are stored under `settings.ATTACHMENTS_DIR` (volume
`attachments:/app/attachments` in docker-compose). Metadata lives in
Postgres; bytes on disk. Deleting the DB row also removes the file.

Any mimetype is accepted (MVP choice); only size is validated
(MAX_ATTACHMENT_SIZE = 20 MB). Stored filenames are uuid+ext to avoid
collisions and path traversal.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attachment import Attachment
from app.models.item import Item
from app.services.errors import NotFoundError, ValidationError


def _attachments_dir() -> Path:
    p = Path(settings.ATTACHMENTS_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _sanitize_ext(filename: str | None) -> str:
    if not filename:
        return ""
    # keep the last extension only, lowercased, alphanumeric-ish
    ext = Path(filename).suffix.lower()
    # strip pathological chars (keep . + alphanum)
    ext = "".join(c for c in ext if c.isalnum() or c == ".")
    if len(ext) > 20:
        ext = ext[:20]
    return ext


def list_attachments(db: Session, item_id: int) -> list[Attachment]:
    # Validate item exists (404 if not)
    item = db.get(Item, item_id)
    if item is None:
        raise NotFoundError(f"Item {item_id} not found")
    return (
        db.query(Attachment)
        .filter(Attachment.item_id == item_id)
        .order_by(Attachment.created_at.asc())
        .all()
    )


def get_attachment(db: Session, attachment_id: int) -> Attachment:
    att = db.get(Attachment, attachment_id)
    if att is None:
        raise NotFoundError(f"Attachment {attachment_id} not found")
    return att


async def create_attachment(
    db: Session, item_id: int, file: UploadFile
) -> Attachment:
    item = db.get(Item, item_id)
    if item is None:
        raise NotFoundError(f"Item {item_id} not found")

    original = file.filename or "file"
    # Prevent directory traversal — keep basename only
    original = os.path.basename(original)
    if not original:
        original = "file"

    content_type = file.content_type or "application/octet-stream"
    ext = _sanitize_ext(original)
    stored = f"{uuid.uuid4().hex}{ext}"

    dir_path = _attachments_dir()
    dest = dir_path / stored

    # Stream to disk with size check
    max_size = settings.MAX_ATTACHMENT_SIZE
    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_size:
                    # cleanup partial file
                    out.close()
                    try:
                        dest.unlink(missing_ok=True)
                    except Exception:
                        pass
                    raise ValidationError(
                        f"file too large: {size} bytes exceeds limit {max_size} bytes (20 MB)"
                    )
                out.write(chunk)
    finally:
        try:
            await file.close()
        except Exception:
            pass

    if size == 0:
        # empty upload — remove empty file and reject
        try:
            dest.unlink(missing_ok=True)
        except Exception:
            pass
        raise ValidationError("empty file not allowed")

    att = Attachment(
        item_id=item_id,
        original_filename=original,
        stored_filename=stored,
        content_type=content_type,
        size=size,
        path=str(dest),
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def delete_attachment(db: Session, attachment_id: int) -> None:
    att = get_attachment(db, attachment_id)
    path = Path(att.path)
    db.delete(att)
    db.commit()
    # Remove file after commit (best-effort — don't fail the request if disk
    # delete fails; row is already gone)
    try:
        path.unlink(missing_ok=True)
    except Exception:
        pass
