from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import StatusAtivoArquivado


class Periodo(Base):
    """Recorte de tempo que agrupa Cadeiras (ex.: um semestre).

    Regra pétrea 8: sem restrição de sobreposição ou sequência entre períodos —
    liberdade total para criar quantos quiser.
    """

    __tablename__ = "periodos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(200))
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[StatusAtivoArquivado] = mapped_column(
        default=StatusAtivoArquivado.ATIVO
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    cadeiras: Mapped[list["Cadeira"]] = relationship(
        back_populates="periodo", cascade="all, delete-orphan"
    )
