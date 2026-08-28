"""add the fixed unassigned column to boards

Revision ID: c4b7f3028a91
Revises: b7c8d9e0f1a2
Create Date: 2026-08-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4b7f3028a91"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "board_columns",
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.execute("UPDATE board_columns SET position = position + 1")
    op.execute(
        "INSERT INTO board_columns (board_id, name, position, is_system) "
        "SELECT id, 'Sem Definição', 0, true FROM boards"
    )
    op.alter_column("board_columns", "is_system", server_default=None)


def downgrade() -> None:
    op.execute("DELETE FROM board_columns WHERE is_system = true")
    op.execute("UPDATE board_columns SET position = position - 1")
    op.drop_column("board_columns", "is_system")
