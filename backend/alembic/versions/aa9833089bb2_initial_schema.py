"""initial schema - users, periods, courses, items, item_types, tags, boards

Revision ID: aa9833089bb2
Revises:
Create Date: 2026-08-20 17:37:52.006699

Note: `boards`, `items` and `board_columns` form a circular dependency
(board -> item, item -> board_column, board_column -> board). Alembic's
autogenerate can't resolve FK cycles on its own (and the order it proposes
fails on Postgres, even though it "accidentally" works on SQLite). The FK
`board_columns.board_id -> boards.id` is created without the constraint and
added afterwards via ALTER TABLE, once every table already exists — this
breaks the cycle without losing referential integrity.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa9833089bb2'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'item_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_item_types_name'), 'item_types', ['name'], unique=True)

    op.create_table(
        'tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tags_name'), 'tags', ['name'], unique=True)

    op.create_table(
        'periods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'ARCHIVED', name='activearchivedstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'courses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=2000), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'ARCHIVED', name='activearchivedstatus'), nullable=False),
        sa.Column('period_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['period_id'], ['periods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # `board_id` has no FK yet — the constraint is added at the end, once
    # `boards` exists (breaks the boards -> items -> board_columns -> boards
    # cycle).
    op.create_table(
        'board_columns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('board_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('item_type_id', sa.Integer(), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'ARCHIVED', 'TRASH', name='itemstatus'), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('board_column_id', sa.Integer(), nullable=True),
        sa.Column('features', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['board_column_id'], ['board_columns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_type_id'], ['item_types.id']),
        sa.ForeignKeyConstraint(['parent_id'], ['items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'boards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('layout', sa.Enum('KANBAN', 'SPRINT', 'LIST', name='boardlayout'), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=True),
        sa.Column('item_id', sa.Integer(), nullable=True),
        sa.CheckConstraint('(course_id IS NOT NULL) != (item_id IS NOT NULL)', name='ck_board_single_owner'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_id'),
        sa.UniqueConstraint('item_id'),
    )

    # Closes the cycle now that `boards` exists. Uses batch mode because
    # SQLite doesn't support ALTER TABLE ADD CONSTRAINT directly (on Postgres
    # this is just a plain ALTER TABLE).
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
    op.drop_table('courses')
    op.drop_table('periods')
    op.drop_index(op.f('ix_tags_name'), table_name='tags')
    op.drop_table('tags')
    op.drop_index(op.f('ix_item_types_name'), table_name='item_types')
    op.drop_table('item_types')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
