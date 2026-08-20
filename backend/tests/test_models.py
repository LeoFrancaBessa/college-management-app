"""Sanity tests for the domain entities (SQLAlchemy).

These don't test migrations (that's validated manually with Alembic) — they
test whether the relationships between Period, Course, Item (nested), Tag and
Board actually work when used via the ORM, including the circular dependency
Board <-> Item <-> BoardColumn.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.board import Board, BoardColumn
from app.models.course import Course
from app.models.enums import BoardLayout, ItemStatus
from app.models.item import Item
from app.models.item_type import ItemType
from app.models.period import Period
from app.models.tag import Tag


@pytest.fixture()
def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_period_course_item_hierarchy(session):
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    exam_type = ItemType(name="Exam")
    item = Item(title="Derivatives exam", item_type=exam_type, course=course)

    session.add_all([period, course, exam_type, item])
    session.commit()

    assert item.course.period.name == "2026.2"
    assert course.items == [item]


def test_unlimited_item_nesting(session):
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    project_type = ItemType(name="Project")

    project = Item(title="Final paper", item_type=project_type, course=course)
    stage = Item(
        title="Literature review",
        item_type=project_type,
        course=course,
        parent=project,
    )
    substage = Item(
        title="Read paper X", item_type=project_type, course=course, parent=stage
    )

    session.add_all([period, course, project_type, project, stage, substage])
    session.commit()

    assert project.children == [stage]
    assert stage.children == [substage]
    assert substage.parent.parent is project


def test_cross_cutting_tags(session):
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    item_type = ItemType(name="Exam")
    urgent_tag = Tag(name="Urgent")
    item = Item(title="Exam", item_type=item_type, course=course, tags=[urgent_tag])

    session.add_all([period, course, item_type, urgent_tag, item])
    session.commit()

    assert item.tags == [urgent_tag]


def test_pluggable_features_as_json(session):
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    item_type = ItemType(name="Exam")
    item = Item(
        title="Exam",
        item_type=item_type,
        course=course,
        features={"grade": {"score": 8.5, "max_score": 10, "weight": 1}},
    )

    session.add_all([period, course, item_type, item])
    session.commit()
    session.refresh(item)

    assert item.features["grade"]["score"] == 8.5


def test_course_board_with_default_columns(session):
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    board = Board(course=course, layout=BoardLayout.KANBAN)
    todo_column = BoardColumn(board=board, name="To do", position=0)
    item_type = ItemType(name="Task")
    item = Item(
        title="Review chapter 3",
        item_type=item_type,
        course=course,
        board_column=todo_column,
    )

    session.add_all([period, course, board, todo_column, item_type, item])
    session.commit()

    assert course.board.columns[0].name == "To do"
    assert course.board.columns[0].items == [item]


def test_item_board_organizes_child_items(session):
    """Board <-> Item <-> BoardColumn cycle: an item can have its own board to
    organize its child items (e.g. a sprint board inside a project)."""
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    item_type = ItemType(name="Project")

    project = Item(title="Final paper", item_type=item_type, course=course)
    project_board = Board(item=project, layout=BoardLayout.SPRINT)
    column = BoardColumn(board=project_board, name="Sprint 1", position=0)
    stage = Item(
        title="Write introduction",
        item_type=item_type,
        course=course,
        parent=project,
        board_column=column,
    )

    session.add_all([period, course, item_type, project, project_board, column, stage])
    session.commit()

    assert project.board.columns[0].items == [stage]


def test_item_status_default_and_soft_delete(session):
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    item_type = ItemType(name="Exam")
    item = Item(title="Exam", item_type=item_type, course=course)

    session.add_all([period, course, item_type, item])
    session.commit()

    assert item.status == ItemStatus.ACTIVE

    item.status = ItemStatus.TRASH
    session.commit()
    session.refresh(item)
    assert item.status == ItemStatus.TRASH


def test_deleting_course_cascades_to_items(session):
    period = Period(name="2026.2")
    course = Course(name="Calculus 3", period=period)
    item_type = ItemType(name="Exam")
    item = Item(title="Exam", item_type=item_type, course=course)

    session.add_all([period, course, item_type, item])
    session.commit()
    item_id = item.id

    session.delete(course)
    session.commit()

    assert session.get(Item, item_id) is None
