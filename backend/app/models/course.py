from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ActiveArchivedStatus


class Course(Base):
    """A course/subject of the degree — belongs to exactly one Period and has
    its own Board (organizes its top-level items)."""

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[ActiveArchivedStatus] = mapped_column(
        default=ActiveArchivedStatus.ACTIVE
    )
    period_id: Mapped[int] = mapped_column(
        ForeignKey("periods.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    period: Mapped["Period"] = relationship(back_populates="courses")
    items: Mapped[list["Item"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
    board: Mapped["Board | None"] = relationship(
        back_populates="course", uselist=False, cascade="all, delete-orphan"
    )
