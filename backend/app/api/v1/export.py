"""RF-40 — Backup/Export JSON.

GET  /api/v1/export — dump completo (Period+Course+Board+Item+Tag+ItemType+features)
POST /api/v1/import — restaura um dump exportado (substitui dados existentes)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.services import export_service

router = APIRouter(
    prefix="/export", tags=["export"], dependencies=[Depends(get_current_user)]
)


@router.get("", summary="Exporta todos os dados em JSON (RF-40)")
def export_data(db: Session = Depends(get_db)):
    payload = export_service.build_export(db)
    # Content-Disposition para download como arquivo
    return JSONResponse(
        content=payload,
        headers={
            "Content-Disposition": 'attachment; filename="college-export.json"',
        },
    )


# /import fica no mesmo arquivo por coesão com RF-40, mas exposto em /api/v1/import
import_router = APIRouter(
    prefix="/import", tags=["export"], dependencies=[Depends(get_current_user)]
)


@import_router.post("", summary="Restaura dados a partir de um dump JSON (RF-40)")
def import_data(payload: dict, db: Session = Depends(get_db)):
    counts = export_service.import_data(db, payload)
    return {"detail": "Import concluído", "imported": counts}
