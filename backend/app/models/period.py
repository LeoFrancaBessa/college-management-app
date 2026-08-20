from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ActiveArchivedStatus


class Period(Base):
    """A stretch of time that groups Courses (e.g. an academic term).

    Business rule 8: no restriction on overlap or sequence between periods —
    full freedom to create as many as needed.
    """

    __tablename__ = "periods"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[ActiveArchivedStatus] = mapped_column(
        default=ActiveArchivedStatus.ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    courses: Mapped[list["Course"]] = relationship(
        back_populates="period", cascade="all, delete-orphan"
    )
