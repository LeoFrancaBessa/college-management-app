"""seed - tipos de item e tags padrao do MVP

Revision ID: 863e91e741c1
Revises: d4a49f1bcc40
Create Date: 2026-08-20 17:18:31.109815

Seed inicial descrito em `specs/05-modelo-de-dominio.md`. Ambas as listas são
extensíveis pelo usuário (RF-15 e RF-27) — este seed só garante um ponto de
partida sensato.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '863e91e741c1'
down_revision: Union[str, Sequence[str], None] = 'd4a49f1bcc40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TIPOS_ITEM = [
    "Prova",
    "Trabalho",
    "Projeto",
    "Aula",
    "Deadline",
    "Evento",
    "Tarefa",
]

TAGS = [
    "Urgente",
    "Importante",
    "Prova",
    "Trabalho em Grupo",
    "Trabalho Individual",
    "Revisão",
    "Aguardando Correção",
    "Bloqueado",
]

tipos_item_table = sa.table("tipos_item", sa.column("nome", sa.String))
tags_table = sa.table("tags", sa.column("nome", sa.String))


def upgrade() -> None:
    """Upgrade schema."""
    op.bulk_insert(tipos_item_table, [{"nome": nome} for nome in TIPOS_ITEM])
    op.bulk_insert(tags_table, [{"nome": nome} for nome in TAGS])


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(tags_table.delete().where(tags_table.c.nome.in_(TAGS)))
    op.execute(tipos_item_table.delete().where(tipos_item_table.c.nome.in_(TIPOS_ITEM)))
