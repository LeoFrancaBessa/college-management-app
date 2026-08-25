"""APScheduler — jobs em background (docs/architecture.md:27).

- RF-39: expira itens da lixeira após 30 dias (hard delete).
- Futuro: recorrência (RF-20).

Roda no mesmo processo do FastAPI (sem Redis/Celery) — single-user, baixa carga.
"""
from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.db.session import SessionLocal

log = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="UTC")


def _job_expire_trash():
    try:
        db = SessionLocal()
        try:
            from app.services.trash_service import expire_trash

            removed = expire_trash(db)
            if removed:
                log.info("Scheduler RF-39: %s itens expirados da lixeira", removed)
        finally:
            db.close()
    except Exception:
        log.exception("Scheduler RF-39 falhou")


def start_scheduler() -> None:
    if scheduler.running:
        return
    # Diário às 03:00 UTC — barato e suficiente para retenção de 30d.
    scheduler.add_job(
        _job_expire_trash,
        "cron",
        hour=3,
        minute=0,
        id="expire_trash",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    log.info("APScheduler iniciado (job expire_trash diário 03:00 UTC)")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("APScheduler parado")
