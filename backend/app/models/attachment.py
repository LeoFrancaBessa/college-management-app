from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Attachment(Base):
    """RF-19 — binary attachment linked to an Item.

    Stored on the `attachments` volume (`/app/attachments` in Docker, see
    `docker-compose.yml:27`). Only metadata lives in Postgres; the file
    itself is on disk (architecture choice — JSONB `features` can't hold
    binaries, see `docs/architecture.md:25`).
    """

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Original filename as sent by the client (for Content-Disposition).
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # Stored filename on disk (uuid + ext), unique to avoid collisions.
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # Mimetype sent by the client (fallback to application/octet-stream).
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    # Absolute path on the server's filesystem (e.g. /app/attachments/ab12.pdf).
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    item: Mapped["Item"] = relationship(back_populates="attachments")
