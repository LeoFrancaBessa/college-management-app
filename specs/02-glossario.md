# Glossário

> Linguagem ubíqua do domínio. Todo termo usado nas specs, no código e nas conversas sobre o
> sistema deve ter definição única aqui.

| Termo | Definição |
|---|---|
| **Período** | Recorte de tempo que agrupa Cadeiras (ex.: um semestre). Não há regra fixa de duração ou sobreposição entre períodos. |
| **Cadeira** | Uma matéria/disciplina da graduação, pertence a exatamente um Período. Possui seu próprio Board. |
| **Item** | Entidade genérica que representa qualquer coisa a gerenciar (prova, tarefa, projeto, deadline, aula, evento...). Pode ter itens-filho (aninhamento ilimitado) e features plugáveis. |
| **Item pai / Item filho** | Relação de aninhamento entre Itens. Um item pode conter outros itens como filhos, sem limite de profundidade. |
| **Tipo de Item** | Classificação do item (ex.: Prova, Trabalho, Projeto, Aula, Deadline, Evento, Tarefa). Lista extensível — o usuário pode criar novos tipos. |
| **Feature plugável** | Capacidade opcional que pode ser ativada em um Item: Nota/Avaliação, Checklist, Anotações, Anexos, Recorrência ou Board. Nenhum tipo de item exige uma feature específica. |
| **Nota/Avaliação (feature)** | Registra nota obtida, nota máxima e peso de um item; alimenta o cálculo de média da cadeira. |
| **Checklist (feature)** | Lista simples de subitens (texto + concluído) embutida em um item — mais leve que um item-filho, sem features/board próprios. |
| **Anotações (feature)** | Texto livre/rico associado ao item. |
| **Anexos (feature)** | Arquivos e imagens vinculados ao item. |
| **Recorrência (feature)** | Regra de repetição de um item (ex.: semanal, dias específicos, até uma data ou N ocorrências), que gera instâncias no cronograma. |
| **Board (feature)** | Quadro visual (kanban, sprint ou lista) que organiza os itens de topo de uma Cadeira, ou os itens-filho de um Item. Vem com colunas padrão sugeridas, totalmente editável. |
| **Tag** | Marcação transversal, independente de Período/Cadeira, aplicável a qualquer item. Lista extensível pelo usuário. |
| **Cronograma** | Visão agregadora (não é uma entidade) que lista itens com data preenchida. Existe o cronograma **geral** (todos os itens) e o **por cadeira** (filtrado). |
| **Arquivamento** | Ação que marca Período, Cadeira ou Item como inativo/arquivado, sem excluir os dados. |
| **Lixeira / soft delete** | Estado de um item excluído (inclusive via IA) que permanece recuperável por um tempo, em vez de ser apagado definitivamente. |
