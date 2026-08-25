from __future__ import annotations

import enum
from datetime import date, datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.board import Board, BoardColumn
from app.models.course import Course
from app.models.enums import ActiveArchivedStatus, BoardLayout, ItemStatus
from app.models.item import Item
from app.models.item_type import ItemType
from app.models.period import Period
from app.models.tag import Tag, item_tags
from app.services.errors import ValidationError


def _iso(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return value
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, str):
        return value
    try:
        return value.value  # type: ignore[attr-defined]
    except Exception:
        return str(value)


def _row_to_dict(obj, fields: list[str]) -> dict:
    out: dict = {}
    for f in fields:
        out[f] = _iso(getattr(obj, f))
    return out


PERIOD_FIELDS = ["id", "name", "start_date", "end_date", "status", "created_at"]
COURSE_FIELDS = ["id", "name", "description", "status", "period_id", "created_at"]
ITEM_TYPE_FIELDS = ["id", "name"]
TAG_FIELDS = ["id", "name", "color"]
BOARD_FIELDS = ["id", "layout", "course_id", "item_id"]
BOARD_COLUMN_FIELDS = ["id", "board_id", "name", "position"]
ITEM_FIELDS = [
    "id",
    "title",
    "item_type_id",
    "due_date",
    "status",
    "course_id",
    "parent_id",
    "board_column_id",
    "features",
    "created_at",
    "updated_at",
    "deleted_at",
]


def _parse_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value)
    raise ValidationError(f"data invalida: {value!r}")


def _parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        iso = value.replace("Z", "+00:00")
        return datetime.fromisoformat(iso)
    raise ValidationError(f"datetime invalido: {value!r}")


def build_export(db: Session) -> dict:
    periods = db.query(Period).order_by(Period.id).all()
    courses = db.query(Course).order_by(Course.id).all()
    item_types = db.query(ItemType).order_by(ItemType.id).all()
    tags = db.query(Tag).order_by(Tag.id).all()
    boards = db.query(Board).order_by(Board.id).all()
    board_columns = db.query(BoardColumn).order_by(BoardColumn.id).all()
    items = db.query(Item).order_by(Item.id).all()
    rows = db.execute(text("SELECT item_id, tag_id FROM item_tags ORDER BY item_id, tag_id")).mappings().all()
    item_tags_list = [dict(r) for r in rows]
    return {
        "version": 1,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "periods": [_row_to_dict(p, PERIOD_FIELDS) for p in periods],
        "courses": [_row_to_dict(c, COURSE_FIELDS) for c in courses],
        "item_types": [_row_to_dict(it, ITEM_TYPE_FIELDS) for it in item_types],
        "tags": [_row_to_dict(t, TAG_FIELDS) for t in tags],
        "boards": [_row_to_dict(b, BOARD_FIELDS) for b in boards],
        "board_columns": [_row_to_dict(bc, BOARD_COLUMN_FIELDS) for bc in board_columns],
        "items": [_row_to_dict(i, ITEM_FIELDS) for i in items],
        "item_tags": item_tags_list,
    }


def _reset_sequences(db: Session) -> None:
    bind = db.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return
    seq_targets = [
        ("periods", "id"),
        ("courses", "id"),
        ("item_types", "id"),
        ("tags", "id"),
        ("boards", "id"),
        ("board_columns", "id"),
        ("items", "id"),
        ("users", "id"),
    ]
    for table, col in seq_targets:
        try:
            db.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence('\"{table}\"','{col}'), "
                    f"COALESCE((SELECT MAX(\"{col}\") FROM \"{table}\"), 1), true)"
                )
            )
        except Exception:
            pass


def import_data(db: Session, payload: dict) -> dict[str, int]:
    if not isinstance(payload, dict):
        raise ValidationError("payload de import deve ser um objeto JSON")
    periods_data: list[dict] = payload.get("periods") or []
    courses_data: list[dict] = payload.get("courses") or []
    item_types_data: list[dict] = payload.get("item_types") or []
    tags_data: list[dict] = payload.get("tags") or []
    boards_data: list[dict] = payload.get("boards") or []
    board_columns_data: list[dict] = payload.get("board_columns") or []
    items_data: list[dict] = payload.get("items") or []
    item_tags_data: list[dict] = payload.get("item_tags") or []
    for name, lst in [
        ("periods", periods_data),
        ("courses", courses_data),
        ("item_types", item_types_data),
        ("tags", tags_data),
        ("boards", boards_data),
        ("board_columns", board_columns_data),
        ("items", items_data),
        ("item_tags", item_tags_data),
    ]:
        if not isinstance(lst, list):
            raise ValidationError(f"campo '{name}' deve ser uma lista")
    try:
        db.execute(text("DELETE FROM item_tags"))
        db.query(Item).delete()
        db.query(BoardColumn).delete()
        db.query(Board).delete()
        db.query(Course).delete()
        db.query(Period).delete()
        db.query(Tag).delete()
        db.query(ItemType).delete()
        db.flush()
        for row in item_types_data:
            db.add(ItemType(id=row["id"], name=row["name"]))
        for row in tags_data:
            db.add(Tag(id=row["id"], name=row["name"], color=row.get("color")))
        for row in periods_data:
            db.add(
                Period(
                    id=row["id"],
                    name=row["name"],
                    start_date=_parse_date(row.get("start_date")),
                    end_date=_parse_date(row.get("end_date")),
                    status=ActiveArchivedStatus(row["status"]) if row.get("status") else ActiveArchivedStatus.ACTIVE,
                    created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
                )
            )
        for row in courses_data:
            db.add(
                Course(
                    id=row["id"],
                    name=row["name"],
                    description=row.get("description"),
                    status=ActiveArchivedStatus(row["status"]) if row.get("status") else ActiveArchivedStatus.ACTIVE,
                    period_id=row["period_id"],
                    created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
                )
            )
        db.flush()
        for row in items_data:
            db.add(
                Item(
                    id=row["id"],
                    title=row["title"],
                    item_type_id=row["item_type_id"],
                    due_date=_parse_dt(row.get("due_date")),
                    status=ItemStatus(row["status"]) if row.get("status") else ItemStatus.ACTIVE,
                    course_id=row["course_id"],
                    parent_id=None,
                    board_column_id=None,
                    features=row.get("features") or {},
                    created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
                    updated_at=_parse_dt(row.get("updated_at")) or datetime.now(timezone.utc),
                    deleted_at=_parse_dt(row.get("deleted_at")),
                )
            )
        db.flush()
        for row in boards_data:
            db.add(
                Board(
                    id=row["id"],
                    layout=BoardLayout(row["layout"]) if row.get("layout") else BoardLayout.KANBAN,
                    course_id=row.get("course_id"),
                    item_id=row.get("item_id"),
                )
            )
        db.flush()
        for row in board_columns_data:
            db.add(
                BoardColumn(
                    id=row["id"],
                    board_id=row["board_id"],
                    name=row["name"],
                    position=row.get("position") if row.get("position") is not None else 0,
                )
            )
        db.flush()
        for row in items_data:
            pid = row.get("parent_id")
            bcid = row.get("board_column_id")
            if pid is not None or bcid is not None:
                item = db.get(Item, row["id"])
                if item is not None:
                    if pid is not None:
                        item.parent_id = pid
                    if bcid is not None:
                        item.board_column_id = bcid
        db.flush()
        for row in item_tags_data:
            db.execute(item_tags.insert().values(item_id=row["item_id"], tag_id=row["tag_id"]))
        db.flush()
        _reset_sequences(db)
        db.commit()
    except ValidationError:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise ValidationError(str(exc)) from exc
    return {
        "periods": len(periods_data),
        "courses": len(courses_data),
        "item_types": len(item_types_data),
        "tags": len(tags_data),
        "boards": len(boards_data),
        "board_columns": len(board_columns_data),
        "items": len(items_data),
        "item_tags": len(item_tags_data),
    }
