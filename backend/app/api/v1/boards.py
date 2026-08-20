from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.board import (
    BoardColumnCreate,
    BoardColumnRead,
    BoardColumnUpdate,
    BoardLayoutUpdate,
    BoardRead,
)
from app.services import board_service

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("/{board_id}", response_model=BoardRead)
def get_board(board_id: int, db: Session = Depends(get_db)):
    return board_service.get_board(db, board_id)


@router.patch("/{board_id}", response_model=BoardRead)
def update_board_layout(
    board_id: int, data: BoardLayoutUpdate, db: Session = Depends(get_db)
):
    board = board_service.get_board(db, board_id)
    return board_service.update_layout(db, board, data)


@router.post("/{board_id}/columns", response_model=BoardColumnRead, status_code=201)
def add_column(board_id: int, data: BoardColumnCreate, db: Session = Depends(get_db)):
    board = board_service.get_board(db, board_id)
    return board_service.add_column(db, board, data)


@router.patch("/{board_id}/columns/{column_id}", response_model=BoardColumnRead)
def update_column(
    board_id: int,
    column_id: int,
    data: BoardColumnUpdate,
    db: Session = Depends(get_db),
):
    column = board_service.get_column(db, board_id, column_id)
    return board_service.update_column(db, column, data)


@router.delete("/{board_id}/columns/{column_id}", status_code=204)
def delete_column(board_id: int, column_id: int, db: Session = Depends(get_db)):
    column = board_service.get_column(db, board_id, column_id)
    board_service.delete_column(db, column)
