from sqlalchemy import CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import LayoutBoard


class Board(Base):
    """Board (kanban/sprint/lista) que organiza os itens de topo de uma Cadeira,
    OU os itens-filho de um Item — nunca os dois ao mesmo tempo (ver
    `05-modelo-de-dominio.md`, feature Board). Vem com colunas padrão sugeridas,
    totalmente editável (ver `04-funcionalidades.md` RF-22/RF-23/RF-24).
    """

    __tablename__ = "boards"
    __table_args__ = (
        CheckConstraint(
            "(cadeira_id IS NOT NULL) != (item_id IS NOT NULL)",
            name="ck_board_owner_exclusivo",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    layout: Mapped[LayoutBoard] = mapped_column(default=LayoutBoard.KANBAN)
    cadeira_id: Mapped[int | None] = mapped_column(
        ForeignKey("cadeiras.id", ondelete="CASCADE"), unique=True, nullable=True
    )
    item_id: Mapped[int | None] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"), unique=True, nullable=True
    )

    cadeira: Mapped["Cadeira | None"] = relationship(back_populates="board")
    item: Mapped["Item | None"] = relationship(
        back_populates="board", foreign_keys=[item_id]
    )
    colunas: Mapped[list["BoardColumn"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardColumn.ordem",
    )


class BoardColumn(Base):
    """Uma coluna de um Board (ex.: 'A fazer', 'Em andamento', 'Concluído')."""

    __tablename__ = "board_columns"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    nome: Mapped[str] = mapped_column(String(100))
    ordem: Mapped[int] = mapped_column(Integer, default=0)

    board: Mapped["Board"] = relationship(back_populates="colunas")
    itens: Mapped[list["Item"]] = relationship(back_populates="board_coluna")
