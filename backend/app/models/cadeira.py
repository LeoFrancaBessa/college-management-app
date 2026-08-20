from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import StatusAtivoArquivado


class Cadeira(Base):
    """Uma matéria/disciplina da graduação — pertence a exatamente um Período e
    possui seu próprio Board (organiza os itens de topo dela)."""

    __tablename__ = "cadeiras"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[StatusAtivoArquivado] = mapped_column(
        default=StatusAtivoArquivado.ATIVO
    )
    periodo_id: Mapped[int] = mapped_column(
        ForeignKey("periodos.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    periodo: Mapped["Periodo"] = relationship(back_populates="cadeiras")
    itens: Mapped[list["Item"]] = relationship(
        back_populates="cadeira", cascade="all, delete-orphan"
    )
    board: Mapped["Board | None"] = relationship(
        back_populates="cadeira", uselist=False, cascade="all, delete-orphan"
    )
