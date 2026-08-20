"""Testes de sanidade das entidades de domínio (SQLAlchemy).

Não testam migrações (isso é validado manualmente com Alembic) — testam se os
relacionamentos entre Período, Cadeira, Item (aninhado), Tag e Board realmente
funcionam quando usados via ORM, incluindo a dependência circular
Board <-> Item <-> BoardColumn.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.board import Board, BoardColumn
from app.models.cadeira import Cadeira
from app.models.enums import LayoutBoard, StatusItem
from app.models.item import Item
from app.models.periodo import Periodo
from app.models.tag import Tag
from app.models.tipo_item import TipoItem


@pytest.fixture()
def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_hierarquia_periodo_cadeira_item(session):
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    tipo_prova = TipoItem(nome="Prova")
    item = Item(titulo="Prova de derivadas", tipo=tipo_prova, cadeira=cadeira)

    session.add_all([periodo, cadeira, tipo_prova, item])
    session.commit()

    assert item.cadeira.periodo.nome == "2026.2"
    assert cadeira.itens == [item]


def test_aninhamento_infinito_de_itens(session):
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    tipo_projeto = TipoItem(nome="Projeto")

    projeto = Item(titulo="Trabalho final", tipo=tipo_projeto, cadeira=cadeira)
    etapa = Item(
        titulo="Levantamento bibliográfico",
        tipo=tipo_projeto,
        cadeira=cadeira,
        parent=projeto,
    )
    subetapa = Item(
        titulo="Ler artigo X", tipo=tipo_projeto, cadeira=cadeira, parent=etapa
    )

    session.add_all([periodo, cadeira, tipo_projeto, projeto, etapa, subetapa])
    session.commit()

    assert projeto.filhos == [etapa]
    assert etapa.filhos == [subetapa]
    assert subetapa.parent.parent is projeto


def test_tags_transversais(session):
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    tipo = TipoItem(nome="Prova")
    tag_urgente = Tag(nome="Urgente")
    item = Item(titulo="Prova", tipo=tipo, cadeira=cadeira, tags=[tag_urgente])

    session.add_all([periodo, cadeira, tipo, tag_urgente, item])
    session.commit()

    assert item.tags == [tag_urgente]


def test_features_plugaveis_em_json(session):
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    tipo = TipoItem(nome="Prova")
    item = Item(
        titulo="Prova",
        tipo=tipo,
        cadeira=cadeira,
        features={"nota": {"obtida": 8.5, "maxima": 10, "peso": 1}},
    )

    session.add_all([periodo, cadeira, tipo, item])
    session.commit()
    session.refresh(item)

    assert item.features["nota"]["obtida"] == 8.5


def test_board_da_cadeira_com_colunas_padrao(session):
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    board = Board(cadeira=cadeira, layout=LayoutBoard.KANBAN)
    coluna_a_fazer = BoardColumn(board=board, nome="A fazer", ordem=0)
    tipo = TipoItem(nome="Tarefa")
    item = Item(
        titulo="Revisar capítulo 3",
        tipo=tipo,
        cadeira=cadeira,
        board_coluna=coluna_a_fazer,
    )

    session.add_all([periodo, cadeira, board, coluna_a_fazer, tipo, item])
    session.commit()

    assert cadeira.board.colunas[0].nome == "A fazer"
    assert cadeira.board.colunas[0].itens == [item]


def test_board_de_item_organiza_itens_filho(session):
    """Ciclo Board <-> Item <-> BoardColumn: um item pode ter seu próprio board
    para organizar os itens-filho (ex.: sprint dentro de um projeto)."""
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    tipo = TipoItem(nome="Projeto")

    projeto = Item(titulo="Trabalho final", tipo=tipo, cadeira=cadeira)
    board_do_projeto = Board(item=projeto, layout=LayoutBoard.SPRINT)
    coluna = BoardColumn(board=board_do_projeto, nome="Sprint 1", ordem=0)
    etapa = Item(
        titulo="Escrever introdução",
        tipo=tipo,
        cadeira=cadeira,
        parent=projeto,
        board_coluna=coluna,
    )

    session.add_all([periodo, cadeira, tipo, projeto, board_do_projeto, coluna, etapa])
    session.commit()

    assert projeto.board.colunas[0].itens == [etapa]


def test_status_item_default_e_soft_delete(session):
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    tipo = TipoItem(nome="Prova")
    item = Item(titulo="Prova", tipo=tipo, cadeira=cadeira)

    session.add_all([periodo, cadeira, tipo, item])
    session.commit()

    assert item.status == StatusItem.ATIVO

    item.status = StatusItem.LIXEIRA
    session.commit()
    session.refresh(item)
    assert item.status == StatusItem.LIXEIRA


def test_exclusao_de_cadeira_em_cascata_remove_itens(session):
    periodo = Periodo(nome="2026.2")
    cadeira = Cadeira(nome="Matemática 3", periodo=periodo)
    tipo = TipoItem(nome="Prova")
    item = Item(titulo="Prova", tipo=tipo, cadeira=cadeira)

    session.add_all([periodo, cadeira, tipo, item])
    session.commit()
    item_id = item.id

    session.delete(cadeira)
    session.commit()

    assert session.get(Item, item_id) is None
