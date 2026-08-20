from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate
from app.services import course_service

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("", response_model=CourseRead, status_code=201)
def create_course(data: CourseCreate, db: Session = Depends(get_db)):
    return course_service.create_course(db, data)


@router.get("", response_model=list[CourseRead])
def list_courses(period_id: int | None = None, db: Session = Depends(get_db)):
    return course_service.list_courses(db, period_id=period_id)


@router.get("/{course_id}", response_model=CourseRead)
def get_course(course_id: int, db: Session = Depends(get_db)):
    return course_service.get_course(db, course_id)


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
