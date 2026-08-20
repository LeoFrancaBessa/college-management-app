from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.item_type import ItemTypeCreate, ItemTypeRead
from app.services import item_type_service

router = APIRouter(prefix="/item-types", tags=["item-types"])


@router.post("", response_model=ItemTypeRead, status_code=201)
def create_item_type(data: ItemTypeCreate, db: Session = Depends(get_db)):
    return item_type_service.create_item_type(db, data)


@router.get("", response_model=list[ItemTypeRead])
def list_item_types(db: Session = Depends(get_db)):
    return item_type_service.list_item_types(db)
