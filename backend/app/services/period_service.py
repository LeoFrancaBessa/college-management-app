from sqlalchemy.orm import Session

from app.models.enums import ActiveArchivedStatus
from app.models.period import Period
from app.schemas.period import PeriodCreate, PeriodUpdate
from app.services.errors import NotFoundError


def create_period(db: Session, data: PeriodCreate) -> Period:
    period = Period(**data.model_dump())
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


def list_periods(db: Session) -> list[Period]:
    return db.query(Period).order_by(Period.created_at.desc()).all()


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
    db.delete(period)
    db.commit()
