from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.item_type import ItemType
from app.schemas.item_type import ItemTypeCreate
from app.services.errors import ConflictError


def create_item_type(db: Session, data: ItemTypeCreate) -> ItemType:
    item_type = ItemType(name=data.name)
    db.add(item_type)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"Item type '{data.name}' already exists")
    db.refresh(item_type)
    return item_type


def list_item_types(db: Session) -> list[ItemType]:
    return db.query(ItemType).order_by(ItemType.name).all()
