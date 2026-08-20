from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ItemStatus
from app.models.tag import item_tags


class Item(Base):
    """Generic entity representing anything to manage (exam, task, project,
    deadline, class, event...). Unlimited nesting via `parent_id` (business
    rule 1).

    `features` holds the data for the pluggable features (Grade, Checklist,
    Notes, Recurrence) — each one is opt-in, none is mandatory for any item
    type (business rule 3). Board is modeled separately (`Board`/`BoardColumn`)
    since it has its own structure.
    """

    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    item_type_id: Mapped[int] = mapped_column(ForeignKey("item_types.id"))
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[ItemStatus] = mapped_column(default=ItemStatus.ACTIVE)

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE")
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"), nullable=True
    )
    board_column_id: Mapped[int | None] = mapped_column(
        ForeignKey("board_columns.id", ondelete="SET NULL"), nullable=True
    )

    features: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    # Set when the item is moved to trash (AI soft delete) — used to
    # permanently expire it after 30 days (RF-39).
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    item_type: Mapped["ItemType"] = relationship()
    course: Mapped["Course"] = relationship(back_populates="items")
    parent: Mapped["Item | None"] = relationship(
        back_populates="children", remote_side=[id]
    )
    children: Mapped[list["Item"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    board_column: Mapped["BoardColumn | None"] = relationship(back_populates="items")
    board: Mapped["Board | None"] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )
    tags: Mapped[list["Tag"]] = relationship(secondary=item_tags)
