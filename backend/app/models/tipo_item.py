from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TipoItem(Base):
    """Tipo de um Item (ex.: Prova, Trabalho, Projeto...).

    Lista extensível pelo usuário — ver `04-funcionalidades.md` RF-15. Seed inicial
    aplicado via migração de dados (Prova, Trabalho, Projeto, Aula, Deadline, Evento,
    Tarefa).
    """

    __tablename__ = "tipos_item"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), unique=True, index=True)
