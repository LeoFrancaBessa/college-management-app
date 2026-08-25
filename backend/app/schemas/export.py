from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ExportPayload(BaseModel):
    """Schema usado apenas para documentar/validar o shape do export.

    O endpoint GET /export retorna um dict livre (não valida linha a linha
    com Pydantic para não engessar), mas este modelo descreve o formato
    esperado e valida o POST /import quando possível.
    """

    version: int = 1
    exported_at: datetime
    periods: list[dict[str, Any]] = []
    courses: list[dict[str, Any]] = []
    item_types: list[dict[str, Any]] = []
    tags: list[dict[str, Any]] = []
    boards: list[dict[str, Any]] = []
    board_columns: list[dict[str, Any]] = []
    items: list[dict[str, Any]] = []
    item_tags: list[dict[str, int]] = []


class ImportResult(BaseModel):
    detail: str
    imported: dict[str, int]
