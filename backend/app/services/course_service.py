from pathlib import Path

from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.course import Course
from app.models.enums import ActiveArchivedStatus, ItemStatus
from app.models.item import Item
from app.schemas.course import CourseAverageRead, CourseCreate, CourseUpdate
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
    # and Board. Collect attachment file paths before DB cascade deletes rows.
    paths: list[str] = []
    try:
        paths = [row[0] for row in db.query(Attachment.path).join(Item, Attachment.item_id == Item.id).filter(Item.course_id == course.id).all()]
    except Exception:
        pass
    db.delete(course)
    db.commit()
    for p in paths:
        try:
            Path(p).unlink(missing_ok=True)
        except Exception:
            pass


# ---------- RF-21 / UC-10 — média ponderada ----------


def _grade_weighted(item: Item) -> tuple[float, float] | None:
    """Extract (score, weight) from Item.features['grade'] if valid.

    - Only ACTIVE items count (caller filters by status).
    - Requires numeric `score`; `weight` defaults to 1 when missing/invalid.
    - Ignores max_score — RF-21 ponderada simples (sum score*weight / sum weight).
    - Returns None if no valid score present (feature not activated or empty).
    """
    features = getattr(item, "features", None) or {}
    # canonical key is "grade" (test_models.py:89); alias "nota" is tolerated
    # for backward compat but not documented — keeps pre-RF-21 dumps working.
    grade = features.get("grade")
    if grade is None:
        grade = features.get("nota")
    if not isinstance(grade, dict):
        return None
    # support both english and PT-BR keys inside the grade object
    raw_score = grade.get("score")
    if raw_score is None:
        raw_score = grade.get("nota_obtida")
    if raw_score is None:
        raw_score = grade.get("obtida")
    if raw_score is None:
        return None
    try:
        score = float(raw_score)
    except Exception:
        return None
    raw_weight = grade.get("weight")
    if raw_weight is None:
        raw_weight = grade.get("peso")
    if raw_weight is None:
        weight = 1.0
    else:
        try:
            weight = float(raw_weight)
        except Exception:
            weight = 1.0
        # non-positive weight is treated as default 1 (avoids div issues)
        if weight <= 0:
            weight = 1.0
    return score, weight


def get_course_average(db: Session, course_id: int) -> CourseAverageRead:
    """RF-21 / UC-10 — média ponderada da cadeira.

    - 404 if course doesn't exist (consistent with other GET /courses/{id} paths).
    - Only ACTIVE items with a launched grade.score contribute — archived/trash
      are ignored even if they carry a features.grade.
    - When count == 0, average is None (UC-10 'sem notas lançadas').
    """
    # ensure the course exists before computing (404 semantics)
    get_course(db, course_id)

    items: list[Item] = (
        db.query(Item)
        .filter(Item.course_id == course_id, Item.status == ItemStatus.ACTIVE)
        .all()
    )
    weighted_sum = 0.0
    total_weight = 0.0
    count = 0
    for item in items:
        parsed = _grade_weighted(item)
        if parsed is None:
            continue
        score, weight = parsed
        weighted_sum += score * weight
        total_weight += weight
        count += 1

    average = (weighted_sum / total_weight) if count else None
    return CourseAverageRead(
        course_id=course_id,
        average=average,
        count=count,
        total_weight=total_weight,
        weighted_sum=weighted_sum,
    )
