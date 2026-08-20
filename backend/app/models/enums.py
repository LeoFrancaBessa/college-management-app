import enum


class StatusAtivoArquivado(str, enum.Enum):
    """Status de Período e Cadeira — não passam por lixeira (Regra pétrea 6:
    arquivamento e exclusão são ações distintas; a exclusão desses dois níveis é
    sempre direta, ver UC-01/UC-02)."""

    ATIVO = "ativo"
    ARQUIVADO = "arquivado"


class StatusItem(str, enum.Enum):
    """Status de Item — inclui `lixeira`, usada apenas na exclusão via IA
    (Regra pétrea 5: exclusão via IA é sempre soft delete)."""

    ATIVO = "ativo"
    ARQUIVADO = "arquivado"
    LIXEIRA = "lixeira"


class LayoutBoard(str, enum.Enum):
    KANBAN = "kanban"
    SPRINT = "sprint"
    LISTA = "lista"
