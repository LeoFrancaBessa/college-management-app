from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Associação N:N entre Item e Tag (Regra pétrea 4: tags são transversais).
item_tags = Table(
    "item_tags",
    Base.metadata,
    Column("item_id", ForeignKey("items.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    """Tag transversal, independente de Período/Cadeira, extensível pelo usuário
    (ver `04-funcionalidades.md` RF-27). Seed inicial aplicado via migração de
    dados (Urgente, Importante, Prova, Trabalho em Grupo, Trabalho Individual,
    Revisão, Aguardando Correção, Bloqueado).
    """

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    cor: Mapped[str | None] = mapped_column(String(20), nullable=True)
