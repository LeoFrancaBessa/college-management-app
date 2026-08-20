from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# N:N association between Item and Tag (business rule 4: tags are cross-cutting).
item_tags = Table(
    "item_tags",
    Base.metadata,
    Column("item_id", ForeignKey("items.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    """Cross-cutting tag, independent of Period/Course, extensible by the user
    (see `04-funcionalidades.md` RF-27). Initial seed applied via a data
    migration; the seed labels themselves stay in Portuguese since they're
    user-facing content, not code.
    """

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
