from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import StatusItem
from app.models.tag import item_tags


class Item(Base):
    """Entidade genérica que representa qualquer coisa a gerenciar (prova, tarefa,
    projeto, deadline, aula, evento...). Aninhamento ilimitado via `parent_id`
    (Regra pétrea 1).

    `features` guarda os dados das features plugáveis ativadas (Nota, Checklist,
    Anotações, Recorrência) — cada uma é opt-in, nenhuma é obrigatória por tipo
    de item (Regra pétrea 3). O Board é modelado separadamente (`Board`/`BoardColumn`)
    por ter estrutura própria.
    """

    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(300))
    tipo_id: Mapped[int] = mapped_column(ForeignKey("tipos_item.id"))
    data_prazo: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[StatusItem] = mapped_column(default=StatusItem.ATIVO)

    cadeira_id: Mapped[int] = mapped_column(
        ForeignKey("cadeiras.id", ondelete="CASCADE")
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"), nullable=True
    )
    board_coluna_id: Mapped[int | None] = mapped_column(
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
    # Preenchido quando o item vai para a lixeira (soft delete via IA) — usado
    # para expirar definitivamente após 30 dias (RF-39).
    excluido_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    tipo: Mapped["TipoItem"] = relationship()
    cadeira: Mapped["Cadeira"] = relationship(back_populates="itens")
    parent: Mapped["Item | None"] = relationship(
        back_populates="filhos", remote_side=[id]
    )
    filhos: Mapped[list["Item"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    board_coluna: Mapped["BoardColumn | None"] = relationship(back_populates="itens")
    board: Mapped["Board | None"] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )
    tags: Mapped[list["Tag"]] = relationship(secondary=item_tags)
