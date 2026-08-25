from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import ActiveArchivedStatus
from app.schemas.course import CourseAverageRead, CourseCreate, CourseRead, CourseUpdate
from app.services import course_service

router = APIRouter(
    prefix="/courses", tags=["courses"], dependencies=[Depends(get_current_user)]
)


@router.post("", response_model=CourseRead, status_code=201)
def create_course(data: CourseCreate, db: Session = Depends(get_db)):
    return course_service.create_course(db, data)


@router.get("", response_model=list[CourseRead])
def list_courses(
    period_id: int | None = None,
    status: ActiveArchivedStatus | None = Query(None, description="Filter by status (active|archived)"),
    include_archived: bool = Query(False, description="When true, returns ACTIVE + ARCHIVED"),
    db: Session = Depends(get_db),
):
    return course_service.list_courses(db, period_id=period_id, status=status, include_archived=include_archived)


@router.get("/{course_id}", response_model=CourseRead)
def get_course(course_id: int, db: Session = Depends(get_db)):
    return course_service.get_course(db, course_id)


@router.get("/{course_id}/average", response_model=CourseAverageRead, summary="RF-21 — média ponderada da cadeira (UC-10)")
def get_course_average(course_id: int, db: Session = Depends(get_db)):
    """Média ponderada sobre Item.features.grade (apenas ACTIVE com score lançado)."""
    return course_service.get_course_average(db, course_id)


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(course_id: int, data: CourseUpdate, db: Session = Depends(get_db)):
    course = course_service.get_course(db, course_id)
    return course_service.update_course(db, course, data)


@router.post("/{course_id}/archive", response_model=CourseRead)
def archive_course(course_id: int, db: Session = Depends(get_db)):
    course = course_service.get_course(db, course_id)
    return course_service.archive_course(db, course)


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = course_service.get_course(db, course_id)
    course_service.delete_course(db, course)
