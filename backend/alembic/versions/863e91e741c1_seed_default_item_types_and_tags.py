"""seed - default item types and tags for the MVP

Revision ID: 863e91e741c1
Revises: aa9833089bb2
Create Date: 2026-08-20 17:18:31.109815

Initial seed described in `specs/05-modelo-de-dominio.md`. Both lists are
extensible by the user (RF-15 and RF-27) — this seed just gives a sensible
starting point. The labels themselves stay in Portuguese since they are
user-facing content (what the user actually sees and types in the app), not
code.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '863e91e741c1'
down_revision: Union[str, Sequence[str], None] = 'aa9833089bb2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ITEM_TYPES = [
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

item_types_table = sa.table("item_types", sa.column("name", sa.String))
tags_table = sa.table("tags", sa.column("name", sa.String))


def upgrade() -> None:
    """Upgrade schema."""
    op.bulk_insert(item_types_table, [{"name": name} for name in ITEM_TYPES])
    op.bulk_insert(tags_table, [{"name": name} for name in TAGS])


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(tags_table.delete().where(tags_table.c.name.in_(TAGS)))
    op.execute(item_types_table.delete().where(item_types_table.c.name.in_(ITEM_TYPES)))
