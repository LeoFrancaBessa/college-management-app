"""Schedule (Cronograma) — view aggregator over Items with due_date.

Regra pétrea 2 (`specs/00-constituicao.md:12`): cronograma nunca é entidade própria.
UC-07 / UC-08 (`specs/03-casos-de-uso.md:67`), RF-30 / RF-31 / RF-32 (`specs/04-funcionalidades.md:51`),
e `specs/05-modelo-de-dominio.md:52`.

V1: lists only the base `Item.due_date`. Recurrence expansion (RF-20) is a TODO
— `Item.features["recurrence"]` will hold the rule, but until RF-20 is
implemented the schedule returns just the stored due_date.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, joinedload

from app.models.enums import ItemStatus
from app.models.item import Item


def _base_query(db: Session):
    """Base query: only active items with a due_date, ordered by due_date."""
    return (
        db.query(Item)
        .options(joinedload(Item.item_type), joinedload(Item.tags))
        .filter(Item.due_date.is_not(None))
        .filter(Item.status == ItemStatus.ACTIVE)
    )


def list_schedule(
    db: Session,
    *,
    course_id: int | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[Item]:
    """RF-30 (geral) + RF-31 (por cadeira).

    - Geral: `course_id is None` → todos os itens com data.
    - Por cadeira: `course_id` filtra.
    - `from_date` / `to_date` são opcionais e filtram `due_date` inclusive.
    - Ordenado por `due_date ASC` (cronológico).
    - TODO(RF-20): expandir instâncias de recorrência aqui quando
      `features.recurrence` existir.
    """
    query = _base_query(db)

    if course_id is not None:
        query = query.filter(Item.course_id == course_id)
    if from_date is not None:
        query = query.filter(Item.due_date >= from_date)
    if to_date is not None:
        query = query.filter(Item.due_date <= to_date)

    return query.order_by(Item.due_date.asc(), Item.id.asc()).all()


def get_homepage(db: Session, *, now: datetime | None = None) -> list[Item]:
    """RF-32 — Homepage Hoje / Próximos 7 dias (UC-08).

    Agrega todas as cadeiras/períodos ativos. Janela: [today 00:00 UTC,
    today+7d 23:59:59.999999 UTC] inclusive.
    `now` é injetável para testes (default: `datetime.now(timezone.utc)`).
    """
    if now is None:
        now = datetime.now(timezone.utc)
    # Normalize to UTC day boundaries
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7, hours=23, minutes=59, seconds=59, microseconds=999999)

    return list_schedule(db, from_date=start, to_date=end)
