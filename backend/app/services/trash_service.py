"""Lixeira — RF-37 / RF-38 / RF-39, UC-11, Regra pétrea 5 + 6.

- Apenas itens excluídos via IA caem aqui (status == TRASH, deleted_at set).
- RF-37: listar itens em lixeira
- RF-38: restaurar item (volta para ACTIVE)
- RF-39: expirar após 30 dias (hard delete automático via APScheduler)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from pathlib import Path

from sqlalchemy.orm import Session, joinedload

from app.models.attachment import Attachment
from app.models.enums import ItemStatus
from app.models.item import Item
from app.services.errors import NotFoundError, ValidationError

log = logging.getLogger(__name__)

RETENTION_DAYS = 30


def list_trash(db: Session, *, course_id: int | None = None) -> list[Item]:
    """RF-37 — lista itens em lixeira, opcionalmente filtrado por cadeira."""
    q = (
        db.query(Item)
        .options(joinedload(Item.item_type), joinedload(Item.tags))
        .filter(Item.status == ItemStatus.TRASH)
    )
    if course_id is not None:
        q = q.filter(Item.course_id == course_id)
    return q.order_by(Item.deleted_at.desc().nulls_last(), Item.id.desc()).all()


def _restore_subtree(db: Session, item: Item) -> None:
    """Restaura item e recursivamente filhos que também estiverem em TRASH."""
    item.status = ItemStatus.ACTIVE
    item.deleted_at = None
    db.add(item)
    for child in item.children:
        if child.status == ItemStatus.TRASH:
            _restore_subtree(db, child)


def restore_item(db: Session, item_id: int) -> Item:
    """RF-38 — restaura item da lixeira para ACTIVE.

    Regra UC-11: se passou da retenção, não permite restaurar.
    Como RF-39 já deleta após 30d, checamos também deleted_at para
    barrar restauração tardia caso o scheduler ainda não tenha rodado.
    """
    item = db.get(Item, item_id)
    if item is None:
        raise NotFoundError(f"Item {item_id} not found")
    if item.status != ItemStatus.TRASH:
        raise ValidationError(f"Item {item_id} is not in trash (status={item.status.value})")
    if item.deleted_at is not None:
        age = datetime.now(timezone.utc) - item.deleted_at
        if age > timedelta(days=RETENTION_DAYS):
            raise ValidationError("Retention period expired (30 days) — item can no longer be restored")
    _restore_subtree(db, item)
    db.commit()
    db.refresh(item)
    log.info("Trash restore item %s (subtree)", item_id)
    return item


def _collect_subtree_ids(db: Session, root_id: int) -> list[int]:
    """Collect all item ids in the subtree rooted at root_id (inclusive)."""
    ids = [root_id]
    queue = [root_id]
    while queue:
        cur = queue.pop()
        children = db.query(Item.id).filter(Item.parent_id == cur).all()
        for (cid,) in children:
            ids.append(cid)
            queue.append(cid)
    return ids


def expire_trash(db: Session, *, retention_days: int = RETENTION_DAYS, now: datetime | None = None) -> int:
    """RF-39 — hard delete de itens expirados da lixeira (> retention_days).

    Retorna quantidade de itens removidos. Chamado pelo APScheduler
    e também pode ser chamado manualmente / em testes com `now` injetável.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=retention_days)
    expired = (
        db.query(Item)
        .filter(Item.status == ItemStatus.TRASH)
        .filter(Item.deleted_at.is_not(None))
        .filter(Item.deleted_at <= cutoff)
        .all()
    )
    # Collect attachment file paths before cascade deletes remove metadata
    paths: list[str] = []
    for item in expired:
        try:
            subtree_ids = _collect_subtree_ids(db, item.id)
            rows = db.query(Attachment.path).filter(Attachment.item_id.in_(subtree_ids)).all()
            paths.extend(r[0] for r in rows)
        except Exception:
            pass
    count = 0
    for item in expired:
        log.info("Trash expire (hard delete) item %s deleted_at=%s", item.id, item.deleted_at)
        db.delete(item)
        count += 1
    if count:
        db.commit()
        for p in paths:
            try:
                Path(p).unlink(missing_ok=True)
            except Exception:
                pass
    return count
