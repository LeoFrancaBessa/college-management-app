"""Schedule (Cronograma) — view aggregator over Items with due_date.

Regra pétrea 2 (`specs/00-constituicao.md:12`): cronograma nunca é entidade própria.
UC-07 / UC-08 (`specs/03-casos-de-uso.md:67`), RF-30 / RF-31 / RF-32 (`specs/04-funcionalidades.md:51`),
RF-20 (`specs/05-modelo-de-dominio.md:87`) e `specs/features/cronograma.md`.

RF-20: `Item.features["recurrence"]` contém a regra (frequency/interval/weekdays/until|count)
e o cronograma expande ocorrências virtualmente — sem tabela extra.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any


def _ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

from sqlalchemy.orm import Session, joinedload

from app.models.enums import ItemStatus
from app.models.item import Item
from app.services.recurrence import expand_recurrence


def _base_query(db: Session):
    """Base query: only active items with a due_date, ordered by due_date."""
    return (
        db.query(Item)
        .options(joinedload(Item.item_type), joinedload(Item.tags))
        .filter(Item.due_date.is_not(None))
        .filter(Item.status == ItemStatus.ACTIVE)
    )


def _has_recurrence(item: Item) -> dict | None:
    feats = getattr(item, "features", None) or {}
    rec = feats.get("recurrence")
    if isinstance(rec, dict) and rec.get("frequency"):
        return rec
    return None


def _occurrence_proxy(item: Item, due_date: datetime) -> Any:
    """Lightweight proxy that looks like Item but with overridden due_date.

    Avoids mutating the ORM instance (which would dirty the session).
    Exposes only the attributes read by `ScheduleItemRead`.
    """
    return SimpleNamespace(
        id=item.id,
        title=item.title,
        due_date=due_date,
        status=item.status,
        course_id=item.course_id,
        parent_id=item.parent_id,
        features=item.features,
        created_at=item.created_at,
        updated_at=item.updated_at,
        item_type=item.item_type,
        tags=item.tags,
    )


def list_schedule(
    db: Session,
    *,
    course_id: int | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int | None = None,
    offset: int | None = None,
) -> list[Any]:
    """RF-30 (geral) + RF-31 (por cadeira) + RF-20 (expansão).

    - Geral: `course_id is None` → todos os itens com data.
    - Por cadeira: `course_id` filtra.
    - `from_date` / `to_date` são opcionais e filtram `due_date` inclusive.
      Para itens com recorrência, cada ocorrência é filtrada individualmente;
      assim, um item com âncora fora da janela ainda aparece se alguma
      ocorrência cair dentro dela.
    - Ordenado por `due_date ASC` (cronológico). Ocorrências do mesmo dia
      ordenadas por `id ASC` para estabilidade.
    """
    query = _base_query(db)

    if course_id is not None:
        query = query.filter(Item.course_id == course_id)

    # Fetch candidates without date filters — recurrence expansão precisa
    # considerar âncoras fora da janela (ex.: semanal desde Jan, janela em Fev).
    # Ordenação final é refeita após expandir; buscar ordenado ajuda no caso
    # sem recorrência (mantém comportamento V1 quando não há features).
    candidates: list[Item] = query.order_by(Item.due_date.asc(), Item.id.asc()).all()

    # Fast path: sem janela e sem recorrência — retorna candidates direto
    # (mantém objetos ORM originais; compatível com callers existentes).
    has_any_recurrence = any(_has_recurrence(it) is not None for it in candidates)
    if not has_any_recurrence and from_date is None and to_date is None:
        if limit is not None or offset is not None:
            start = offset or 0
            end = (start + limit) if limit is not None else None
            return candidates[start:end]  # type: ignore[return-value]
        return candidates  # type: ignore[return-value]

    # Normaliza janelas naive como UTC para evitar TypeError com anchors aware
    eff_from = _ensure_aware(from_date)
    eff_to = _ensure_aware(to_date)
    occurrences: list[Any] = []
    for item in candidates:
        rec = _has_recurrence(item)
        anchor = _ensure_aware(item.due_date)  # type: ignore[assignment]
        assert anchor is not None
        anchor_n = anchor  # type: ignore[assignment]
        if rec is not None:
            try:
                dates = expand_recurrence(anchor_n, rec, from_date=eff_from, to_date=eff_to)
            except Exception:
                # Recorrência corrompida (dado legado sem validação) — trata
                # como item simples para não quebrar o cronograma.
                dates = []
                if (eff_from is None or anchor_n >= eff_from) and (eff_to is None or anchor_n <= eff_to):
                    dates = [anchor_n]
            for d in dates:
                occurrences.append(_occurrence_proxy(item, d))
        else:
            if (eff_from is None or anchor_n >= eff_from) and (eff_to is None or anchor_n <= eff_to):
                # Sem recorrência: retorna o próprio ORM quando possível para
                # manter compatibilidade, mas envolve em proxy se houver outras
                # ocorrências na lista (para ordenação uniforme).
                if has_any_recurrence:
                    occurrences.append(_occurrence_proxy(item, anchor_n))
                else:
                    occurrences.append(item)

    # Ordenação cronológica global (ocorrências intercaladas entre itens)
    occurrences.sort(key=lambda o: (o.due_date, o.id))
    if limit is not None or offset is not None:
        start = offset or 0
        end = (start + limit) if limit is not None else None
        return occurrences[start:end]
    return occurrences


def get_homepage(db: Session, *, now: datetime | None = None) -> list[Any]:
    """RF-32 — Homepage Hoje / Próximos 7 dias (UC-08).

    Agrega todas as cadeiras/períodos ativos. Janela: [today 00:00 UTC,
    today+7d 23:59:59.999999 UTC] inclusive.
    `now` é injetável para testes (default: `datetime.now(timezone.utc)`).
    """
    if now is None:
        now = datetime.now(timezone.utc)
    now = _ensure_aware(now)  # type: ignore[assignment]
    # Normalize to UTC day boundaries
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7, hours=23, minutes=59, seconds=59, microseconds=999999)

    return list_schedule(db, from_date=start, to_date=end)
