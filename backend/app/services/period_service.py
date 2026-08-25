from pathlib import Path

from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.course import Course
from app.models.enums import ActiveArchivedStatus
from app.models.item import Item
from app.models.period import Period
from app.schemas.period import PeriodCreate, PeriodUpdate
from app.services.errors import NotFoundError


def create_period(db: Session, data: PeriodCreate) -> Period:
    period = Period(**data.model_dump())
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


def list_periods(
    db: Session,
    *,
    status: ActiveArchivedStatus | None = None,
    include_archived: bool = False,
) -> list[Period]:
    """Lista períodos. Por padrão retorna só ACTIVE (Regra 6 / UC-01:
    arquivado some das listas ativas). Use `status` para filtrar um status
    específico ou `include_archived=True` para ACTIVE+ARCHIVED."""
    query = db.query(Period)
    if status is not None:
        query = query.filter(Period.status == status)
    elif not include_archived:
        query = query.filter(Period.status == ActiveArchivedStatus.ACTIVE)
    return query.order_by(Period.created_at.desc()).all()


def get_period(db: Session, period_id: int) -> Period:
    period = db.get(Period, period_id)
    if period is None:
        raise NotFoundError(f"Period {period_id} not found")
    return period


def update_period(db: Session, period: Period, data: PeriodUpdate) -> Period:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(period, field, value)
    db.commit()
    db.refresh(period)
    return period


def archive_period(db: Session, period: Period) -> Period:
    period.status = ActiveArchivedStatus.ARCHIVED
    db.commit()
    db.refresh(period)
    return period


def delete_period(db: Session, period: Period) -> None:
    # Business rule 6: deleting a Period is direct (no trash) and cascades to
    # its Courses and Items (see the cascade="all, delete-orphan" relationships).
    # Collect attachment paths before cascade deletes the rows.
    paths: list[str] = []
    try:
        # Use a direct query — more reliable than traversing unloaded relationships
        paths = [
            row[0]
            for row in db.query(Attachment.path)
            .join(Item, Attachment.item_id == Item.id)
            .join(Course, Item.course_id == Course.id)
            .filter(Course.period_id == period.id)
            .all()
        ]
    except Exception:
        pass
    db.delete(period)
    db.commit()
    for p in paths:
        try:
            Path(p).unlink(missing_ok=True)
        except Exception:
            pass
