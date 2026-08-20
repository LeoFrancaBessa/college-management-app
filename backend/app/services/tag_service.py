from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.tag import Tag
from app.schemas.tag import TagCreate
from app.services.errors import ConflictError


def create_tag(db: Session, data: TagCreate) -> Tag:
    tag = Tag(name=data.name, color=data.color)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"Tag '{data.name}' already exists")
    db.refresh(tag)
    return tag


def list_tags(db: Session) -> list[Tag]:
    return db.query(Tag).order_by(Tag.name).all()
