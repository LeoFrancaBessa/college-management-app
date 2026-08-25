from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.item import ItemRead
from app.services import trash_service

router = APIRouter(
    prefix="/trash", tags=["trash"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[ItemRead])
def list_trash(
    course_id: int | None = Query(None, description="Filter by course — RF-37"),
    db: Session = Depends(get_db),
):
    """RF-37 — lista itens em lixeira (excluídos via IA)."""
    return trash_service.list_trash(db, course_id=course_id)


@router.post("/{item_id}/restore", response_model=ItemRead)
def restore_item(item_id: int, db: Session = Depends(get_db)):
    """RF-38 — restaura item da lixeira. Retorna 404 se não existe, 400 se não está em trash."""
    return trash_service.restore_item(db, item_id)
