from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.period import PeriodCreate, PeriodRead, PeriodUpdate
from app.services import period_service

router = APIRouter(prefix="/periods", tags=["periods"])


@router.post("", response_model=PeriodRead, status_code=201)
def create_period(data: PeriodCreate, db: Session = Depends(get_db)):
    return period_service.create_period(db, data)


@router.get("", response_model=list[PeriodRead])
def list_periods(db: Session = Depends(get_db)):
    return period_service.list_periods(db)


@router.get("/{period_id}", response_model=PeriodRead)
def get_period(period_id: int, db: Session = Depends(get_db)):
    return period_service.get_period(db, period_id)


@router.patch("/{period_id}", response_model=PeriodRead)
def update_period(period_id: int, data: PeriodUpdate, db: Session = Depends(get_db)):
    period = period_service.get_period(db, period_id)
    return period_service.update_period(db, period, data)


@router.post("/{period_id}/archive", response_model=PeriodRead)
def archive_period(period_id: int, db: Session = Depends(get_db)):
    period = period_service.get_period(db, period_id)
    return period_service.archive_period(db, period)


@router.delete("/{period_id}", status_code=204)
def delete_period(period_id: int, db: Session = Depends(get_db)):
    period = period_service.get_period(db, period_id)
    period_service.delete_period(db, period)
