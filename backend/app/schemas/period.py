from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ActiveArchivedStatus


class PeriodBase(BaseModel):
    name: str
    start_date: date | None = None
    end_date: date | None = None


class PeriodCreate(PeriodBase):
    pass


class PeriodUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class PeriodRead(PeriodBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ActiveArchivedStatus
    created_at: datetime
