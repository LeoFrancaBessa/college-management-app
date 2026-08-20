from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ItemType(Base):
    """Type of an Item (e.g. Exam, Assignment, Project...).

    Extensible list, managed by the user — see `04-funcionalidades.md` RF-15.
    Initial seed applied via a data migration; the seed labels themselves stay
    in Portuguese since they're user-facing content, not code.
    """

    __tablename__ = "item_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
