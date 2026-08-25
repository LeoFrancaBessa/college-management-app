from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.schedule import ScheduleItemRead
from app.services import schedule_service

router = APIRouter(
    prefix="/schedule", tags=["schedule"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[ScheduleItemRead])
def get_schedule(
    course_id: int | None = Query(None, description="Filter by course — RF-31"),
    from_date: datetime | None = Query(None, description="Inclusive lower bound on due_date"),
    to_date: datetime | None = Query(None, description="Inclusive upper bound on due_date"),
    limit: int | None = Query(None, ge=1, le=100, description="Max items to return"),
    offset: int | None = Query(None, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """RF-30 (geral) + RF-31 (por cadeira). View agregadora — never an entity (Regra 2)."""
    return schedule_service.list_schedule(
        db, course_id=course_id, from_date=from_date, to_date=to_date, limit=limit, offset=offset
    )


@router.get("/homepage", response_model=list[ScheduleItemRead])
def get_homepage(db: Session = Depends(get_db)):
    """RF-32 — Homepage Hoje / Próximos 7 dias (UC-08)."""
    return schedule_service.get_homepage(db)
