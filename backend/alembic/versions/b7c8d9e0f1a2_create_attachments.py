"""create attachments table (RF-19)

Revision ID: b7c8d9e0f1a2
Revises: 863e91e741c1
Create Date: 2026-08-25

Attachment is a binary file linked to an Item — metadata in Postgres,
file bytes on the `attachments` volume (/app/attachments).
See docs/architecture.md:25 and specs/05-modelo-de-dominio.md:83.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "863e91e741c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("path", sa.String(length=1024), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attachments_item_id", "attachments", ["item_id"])


def downgrade() -> None:
    op.drop_index("ix_attachments_item_id", table_name="attachments")
    op.drop_table("attachments")
