import enum


class ActiveArchivedStatus(str, enum.Enum):
    """Status for Period and Course — never go through trash (business rule 6:
    archiving and deletion are distinct actions; deleting these two levels is
    always direct, see UC-01/UC-02)."""

    ACTIVE = "active"
    ARCHIVED = "archived"


class ItemStatus(str, enum.Enum):
    """Status for Item — includes `trash`, used only for AI-driven deletion
    (business rule 5: AI deletion is always a soft delete)."""

    ACTIVE = "active"
    ARCHIVED = "archived"
    TRASH = "trash"


class BoardLayout(str, enum.Enum):
    KANBAN = "kanban"
    SPRINT = "sprint"
    LIST = "list"
