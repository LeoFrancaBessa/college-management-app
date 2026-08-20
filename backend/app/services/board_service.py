from sqlalchemy.orm import Session

from app.models.board import Board, BoardColumn
from app.models.course import Course
from app.models.enums import BoardLayout
from app.models.item import Item
from app.schemas.board import BoardColumnCreate, BoardColumnUpdate, BoardLayoutUpdate
from app.services.errors import NotFoundError

# Suggested default columns (RF-22) — kept in Portuguese since it's
# user-facing content the user will see and edit, not code.
DEFAULT_COLUMN_NAMES = ["A fazer", "Em andamento", "Concluído"]


def build_default_board(*, course: Course | None = None, item: Item | None = None) -> Board:
    """Builds a Board with the suggested default columns, owned either by a
    Course (organizes its top-level items) or by an Item (organizes its child
    items) — never both at once (see `Board.__table_args__`)."""
    board = Board(course=course, item=item, layout=BoardLayout.KANBAN)
    for position, name in enumerate(DEFAULT_COLUMN_NAMES):
        board.columns.append(BoardColumn(name=name, position=position))
    return board


def get_board(db: Session, board_id: int) -> Board:
    board = db.get(Board, board_id)
    if board is None:
        raise NotFoundError(f"Board {board_id} not found")
    return board


def get_column(db: Session, board_id: int, column_id: int) -> BoardColumn:
    column = db.get(BoardColumn, column_id)
    if column is None or column.board_id != board_id:
        raise NotFoundError(f"Column {column_id} not found on board {board_id}")
    return column


def update_layout(db: Session, board: Board, data: BoardLayoutUpdate) -> Board:
    board.layout = data.layout
    db.commit()
    db.refresh(board)
    return board


def add_column(db: Session, board: Board, data: BoardColumnCreate) -> BoardColumn:
    position = data.position if data.position is not None else len(board.columns)
    column = BoardColumn(board_id=board.id, name=data.name, position=position)
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


def update_column(db: Session, column: BoardColumn, data: BoardColumnUpdate) -> BoardColumn:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(column, field, value)
    db.commit()
    db.refresh(column)
    return column


def delete_column(db: Session, column: BoardColumn) -> None:
    # Items pointing at this column fall back to board_column_id = NULL
    # (ON DELETE SET NULL on the FK) — they're not deleted.
    db.delete(column)
    db.commit()
