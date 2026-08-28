from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import BoardLayout


class Board(Base):
    """Board (kanban/sprint/list) that organizes the top-level items of a
    Course, OR the child items of an Item — never both at once (see
    `05-modelo-de-dominio.md`, Board feature). Created with suggested default
    columns, fully editable (see `04-funcionalidades.md` RF-22/RF-23/RF-24).
    """

    __tablename__ = "boards"
    __table_args__ = (
        CheckConstraint(
            "(course_id IS NOT NULL) != (item_id IS NOT NULL)",
            name="ck_board_single_owner",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    layout: Mapped[BoardLayout] = mapped_column(default=BoardLayout.KANBAN)
    course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), unique=True, nullable=True
    )
    item_id: Mapped[int | None] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"), unique=True, nullable=True
    )

    course: Mapped["Course | None"] = relationship(back_populates="board")
    item: Mapped["Item | None"] = relationship(
        back_populates="board", foreign_keys=[item_id]
    )
    columns: Mapped[list["BoardColumn"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardColumn.position",
    )


class BoardColumn(Base):
    """A column of a Board (e.g. 'To do', 'In progress', 'Done')."""

    __tablename__ = "board_columns"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

    board: Mapped["Board"] = relationship(back_populates="columns")
    items: Mapped[list["Item"]] = relationship(back_populates="board_column")
