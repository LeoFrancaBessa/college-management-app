# Funcionalidades

> Requisitos funcionais, agrupados por módulo. Cada funcionalidade maior ganha um detalhamento
> próprio em `features/<nome-da-feature>.md`.

## Módulo: Período

- [ ] **RF-01** — Criar período (nome, data início/fim opcionais)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-01
  - **Regras de negócio relacionadas:** Regra pétrea 1, Regra pétrea 8
- [ ] **RF-02** — Editar período
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-01
- [ ] **RF-03** — Arquivar período (sai das listas ativas, mantém histórico)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-01
  - **Regras de negócio relacionadas:** Regra pétrea 6
- [ ] **RF-04** — Excluir período (cascata sobre cadeiras/itens, com confirmação)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-01
  - **Regras de negócio relacionadas:** Regra pétrea 6

## Módulo: Cadeira

- [ ] **RF-05** — Criar cadeira vinculada a um período (gera Board padrão com colunas sugeridas)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-02
  - **Regras de negócio relacionadas:** Regra pétrea 1
- [ ] **RF-06** — Editar cadeira (nome, descrição)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-02
- [ ] **RF-07** — Arquivar cadeira
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-02
  - **Regras de negócio relacionadas:** Regra pétrea 6
- [ ] **RF-08** — Excluir cadeira (cascata sobre itens, com confirmação)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-02
  - **Regras de negócio relacionadas:** Regra pétrea 6

## Módulo: Item

- [ ] **RF-09** — Criar item de topo vinculado a uma cadeira (título, tipo, data opcional)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-03
  - **Regras de negócio relacionadas:** Regra pétrea 1
- [ ] **RF-10** — Criar item-filho a partir de um item existente (aninhamento ilimitado)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-03
  - **Regras de negócio relacionadas:** Regra pétrea 1, invariante "sem ciclos" (`05-modelo-de-dominio.md`)
- [ ] **RF-11** — Editar item (título, tipo, data)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-03
- [ ] **RF-12** — Reparentar item (mover entre item pai, ou para item de topo)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-03
  - **Regras de negócio relacionadas:** invariante "sem ciclos" (`05-modelo-de-dominio.md`)
- [ ] **RF-13** — Arquivar item
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-03
  - **Regras de negócio relacionadas:** Regra pétrea 6
- [ ] **RF-14** — Excluir item manualmente (ação direta, com confirmação — diferente da exclusão via IA)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-03
  - **Regras de negócio relacionadas:** Regra pétrea 6, Regra pétrea 9
- [ ] **RF-15** — Cadastrar novo Tipo de Item (lista extensível: Prova, Trabalho, Projeto, Aula, Deadline, Evento, Tarefa, ...)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-03

## Módulo: Features plugáveis

- [ ] **RF-16** — Ativar/desativar feature **Nota/Avaliação** em um item (nota obtida, nota máxima, peso)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-05
  - **Regras de negócio relacionadas:** Regra pétrea 3
- [ ] **RF-17** — Ativar/desativar feature **Checklist** em um item (lista de subitens texto + concluído)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-05
  - **Regras de negócio relacionadas:** Regra pétrea 3
- [ ] **RF-18** — Ativar/desativar feature **Anotações** em um item (texto rico/markdown)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-05
  - **Regras de negócio relacionadas:** Regra pétrea 3
- [x] **RF-19** — Ativar/desativar feature **Anexos** em um item (upload de arquivos/imagens)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-05
  - **Regras de negócio relacionadas:** Regra pétrea 3
- [ ] **RF-20** — Ativar/desativar feature **Recorrência** em um item (frequência + término por data ou nº de ocorrências)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-05
  - **Regras de negócio relacionadas:** Regra pétrea 3
- [x] **RF-21** — Calcular e exibir a média da cadeira (ponderada pelo peso, entre itens com feature Nota lançada)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-10

## Módulo: Board

- [ ] **RF-22** — Gerar Board padrão automaticamente ao criar uma cadeira (colunas sugeridas)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-02, UC-06
- [ ] **RF-23** — Customizar colunas do board (renomear, reordenar, adicionar, remover)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-06
- [ ] **RF-24** — Escolher o layout do board (kanban, sprint, lista)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-06
- [ ] **RF-25** — Mover item entre colunas do board
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-06
- [ ] **RF-26** — Ativar feature Board em um item (sub-quadro para organizar seus itens-filho)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-06
  - **Regras de negócio relacionadas:** Regra pétrea 3

## Módulo: Tags

- [ ] **RF-27** — Criar tag (nome, cor opcional)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-09
  - **Regras de negócio relacionadas:** Regra pétrea 4
- [ ] **RF-28** — Aplicar tag a um item
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-09
- [ ] **RF-29** — Remover tag de um item
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-09

## Módulo: Cronograma

- [ ] **RF-30** — Exibir cronograma geral (todos os itens com data, incluindo instâncias de recorrência)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-07
  - **Regras de negócio relacionadas:** Regra pétrea 2
- [ ] **RF-31** — Exibir cronograma por cadeira (mesmo agregador, filtrado)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-07
  - **Regras de negócio relacionadas:** Regra pétrea 2
- [ ] **RF-32** — Exibir homepage "Hoje / Próximos 7 dias"
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-08

## Módulo: IA (linguagem natural)

- [ ] **RF-33** — Interpretar comando em linguagem natural livre e criar item automaticamente
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-04
  - **Regras de negócio relacionadas:** Regra pétrea 9
- [ ] **RF-34** — Interpretar comando em linguagem natural livre e editar item existente
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-04
  - **Regras de negócio relacionadas:** Regra pétrea 9
- [ ] **RF-35** — Interpretar comando em linguagem natural livre e excluir item(ns) (sempre soft delete)
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-04
  - **Regras de negócio relacionadas:** Regra pétrea 5, Regra pétrea 9
- [ ] **RF-36** — Avisar quando não conseguir interpretar o comando, sem executar nenhuma ação, e pedir para o usuário explicar melhor
  - **Prioridade:** Alta
  - **Casos de uso relacionados:** UC-04

## Módulo: Lixeira

- [ ] **RF-37** — Listar itens em lixeira (excluídos via IA)
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-11
  - **Regras de negócio relacionadas:** Regra pétrea 5
- [ ] **RF-38** — Restaurar item da lixeira
  - **Prioridade:** Média
  - **Casos de uso relacionados:** UC-11
- [ ] **RF-39** — Expirar item da lixeira após 30 dias de retenção (exclusão definitiva automática)
  - **Prioridade:** Baixa
  - **Casos de uso relacionados:** UC-11

## Módulo: Backup e Exportação

- [x] **RF-40** — Exportar todos os dados do usuário (Períodos, Cadeiras, Itens, features, tags, boards) em um formato portável (ex.: JSON)
  - **Prioridade:** Alta
  - **Regras de negócio relacionadas:** `06-requisitos-nao-funcionais.md` — Backup e portabilidade de dados
