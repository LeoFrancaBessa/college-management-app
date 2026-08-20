from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.tag import TagCreate, TagRead
from app.services import tag_service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.post("", response_model=TagRead, status_code=201)
def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    return tag_service.create_tag(db, data)


@router.get("", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)):
    return tag_service.list_tags(db)
