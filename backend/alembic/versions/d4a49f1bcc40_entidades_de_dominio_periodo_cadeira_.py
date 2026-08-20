"""entidades de dominio - periodo, cadeira, item, tipo_item, tag, board

Revision ID: d4a49f1bcc40
Revises: 55d93ca66a06
Create Date: 2026-08-20 17:15:19.260316

Nota: `boards`, `items` e `board_columns` formam uma dependência circular
(board -> item, item -> board_column, board_column -> board). O autogenerate do
Alembic não resolve ciclos de FK sozinho (e a ordem que ele propõe falha em
Postgres, mesmo passando "por acidente" em SQLite). A FK
`board_columns.board_id -> boards.id` é criada sem a constraint e adicionada
depois via ALTER TABLE, uma vez que todas as tabelas já existem — isso quebra o
ciclo sem perder a integridade referencial.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4a49f1bcc40'
down_revision: Union[str, Sequence[str], None] = '55d93ca66a06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'tipos_item',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tipos_item_nome'), 'tipos_item', ['nome'], unique=True)

    op.create_table(
        'tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('cor', sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tags_nome'), 'tags', ['nome'], unique=True)

    op.create_table(
        'periodos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('data_inicio', sa.Date(), nullable=True),
        sa.Column('data_fim', sa.Date(), nullable=True),
        sa.Column('status', sa.Enum('ATIVO', 'ARQUIVADO', name='statusativoarquivado'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'cadeiras',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('descricao', sa.String(length=2000), nullable=True),
        sa.Column('status', sa.Enum('ATIVO', 'ARQUIVADO', name='statusativoarquivado'), nullable=False),
        sa.Column('periodo_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['periodo_id'], ['periodos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # `board_id` sem FK por enquanto — a constraint é adicionada no final, depois
    # que `boards` existir (quebra o ciclo boards -> items -> board_columns -> boards).
    op.create_table(
        'board_columns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('board_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=300), nullable=False),
        sa.Column('tipo_id', sa.Integer(), nullable=False),
        sa.Column('data_prazo', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('ATIVO', 'ARQUIVADO', 'LIXEIRA', name='statusitem'), nullable=False),
        sa.Column('cadeira_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('board_coluna_id', sa.Integer(), nullable=True),
        sa.Column('features', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('excluido_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['board_coluna_id'], ['board_columns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['cadeira_id'], ['cadeiras.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tipo_id'], ['tipos_item.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'boards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('layout', sa.Enum('KANBAN', 'SPRINT', 'LISTA', name='layoutboard'), nullable=False),
        sa.Column('cadeira_id', sa.Integer(), nullable=True),
        sa.Column('item_id', sa.Integer(), nullable=True),
        sa.CheckConstraint('(cadeira_id IS NOT NULL) != (item_id IS NOT NULL)', name='ck_board_owner_exclusivo'),
        sa.ForeignKeyConstraint(['cadeira_id'], ['cadeiras.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cadeira_id'),
        sa.UniqueConstraint('item_id'),
    )

    # Fecha o ciclo agora que `boards` existe. Usa batch mode porque o SQLite não
    # suporta ALTER TABLE ADD CONSTRAINT diretamente (no Postgres isso equivale a
    # um ALTER TABLE normal).
    with op.batch_alter_table('board_columns') as batch_op:
        batch_op.create_foreign_key(
            'fk_board_columns_board_id',
            'boards',
            ['board_id'], ['id'],
            ondelete='CASCADE',
        )

    op.create_table(
        'item_tags',
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('item_id', 'tag_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('item_tags')
    with op.batch_alter_table('board_columns') as batch_op:
        batch_op.drop_constraint('fk_board_columns_board_id', type_='foreignkey')
    op.drop_table('boards')
    op.drop_table('items')
    op.drop_table('board_columns')
    op.drop_table('cadeiras')
    op.drop_table('periodos')
    op.drop_index(op.f('ix_tags_nome'), table_name='tags')
    op.drop_table('tags')
    op.drop_index(op.f('ix_tipos_item_nome'), table_name='tipos_item')
    op.drop_table('tipos_item')
