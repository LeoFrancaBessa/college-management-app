from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.enums import ActiveArchivedStatus
from app.schemas.course import CourseCreate, CourseUpdate
from app.services import period_service
from app.services.board_service import build_default_board
from app.services.errors import NotFoundError


def create_course(db: Session, data: CourseCreate) -> Course:
    period_service.get_period(db, data.period_id)  # 404s if the period doesn't exist

    course = Course(
        name=data.name, description=data.description, period_id=data.period_id
    )
    db.add(course)
    db.flush()  # need course.id before attaching its board
    board = build_default_board(course=course)  # RF-22
    db.add(board)  # explicit add: Board sits under two delete-orphan parents
    # (Course.board and Item.board), so relationship-cascade auto-add is
    # ambiguous — see the SAWarning this avoids.
    db.commit()
    db.refresh(course)
    return course


def list_courses(db: Session, period_id: int | None = None) -> list[Course]:
    query = db.query(Course)
    if period_id is not None:
        query = query.filter(Course.period_id == period_id)
    return query.order_by(Course.created_at.desc()).all()


def get_course(db: Session, course_id: int) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise NotFoundError(f"Course {course_id} not found")
    return course


def update_course(db: Session, course: Course, data: CourseUpdate) -> Course:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


def archive_course(db: Session, course: Course) -> Course:
    course.status = ActiveArchivedStatus.ARCHIVED
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course: Course) -> None:
    # Business rule 6: deletion is direct (no trash) and cascades to its Items
    # and Board.
    db.delete(course)
    db.commit()
