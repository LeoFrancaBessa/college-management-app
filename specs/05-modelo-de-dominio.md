# Modelo de Domínio

## Entidades

### Entidade: Período

- **Atributos:**
  - nome
  - data início (opcional)
  - data fim (opcional)
  - status: `ativo` | `arquivado`
- **Relacionamentos:**
  - contém N Cadeiras
- **Invariantes:**
  - nenhuma restrição de sobreposição ou sequência entre períodos (liberdade total)

### Entidade: Cadeira

- **Atributos:**
  - nome
  - descrição (opcional)
  - status: `ativo` | `arquivado`
- **Relacionamentos:**
  - pertence a exatamente 1 Período
  - contém N Itens de topo
  - possui 1 Board próprio (organiza seus itens de topo)
- **Invariantes:**
  - sempre vinculada a um único período

### Entidade: Item

- **Atributos:**
  - título
  - tipo (referência a Tipo de Item)
  - data/prazo (opcional — presença dela é o que faz o item aparecer no cronograma)
  - status: `ativo` | `arquivado` | `lixeira` (soft delete)
- **Relacionamentos:**
  - pertence a 1 Cadeira (diretamente, se for item de topo; por herança do item raiz, se for
    item-filho)
  - item pai (opcional) — 0 ou 1
  - itens-filho — 0..N, aninhamento sem limite de profundidade
  - tags — 0..N
  - features plugáveis ativadas — 0..1 de cada tipo (Nota, Checklist, Anotações, Anexos,
    Recorrência, Board)
- **Invariantes:**
  - não pode ser pai de si mesmo, direta ou indiretamente (sem ciclos)
  - o tipo deve pertencer à lista de Tipos de Item cadastrados

### Entidade: Tipo de Item

- **Atributos:**
  - nome
- **Seed inicial (MVP):** Prova, Trabalho, Projeto, Aula, Deadline, Evento, Tarefa
- Lista extensível — o usuário pode cadastrar novos tipos livremente

### Entidade: Tag

- **Atributos:**
  - nome
  - cor (opcional)
- **Seed inicial (MVP):** Urgente, Importante, Prova, Trabalho em Grupo, Trabalho Individual,
  Revisão, Aguardando Correção, Bloqueado
- **Relacionamentos:** N:N com Item
- Lista extensível — o usuário pode criar novas tags livremente

### Feature: Nota / Avaliação

- **Atributos:** nota obtida, nota máxima (padrão 10), peso (opcional, padrão 1)
- **Regra:** quando ativada em itens de uma cadeira, contribui para o cálculo da média da
  cadeira (média ponderada pelo peso, considerando apenas itens com a feature ativada e nota
  lançada)

### Feature: Checklist

- **Atributos:** lista de subitens (texto, concluído: sim/não)
- **Nota:** não é um Item completo — não tem features ou board próprios; serve para afazeres
  simples dentro de um item (ex.: "levar calculadora", "revisar capítulo 3")

### Feature: Anotações

- **Atributos:** texto rico (markdown)

### Feature: Anexos

- **Atributos:** lista de arquivos e imagens vinculados ao item

### Feature: Recorrência

- **Atributos:** frequência (ex.: semanal, dias específicos da semana), condição de término
  (data-limite OU número de ocorrências)
- **Regra:** gera as instâncias que aparecem no cronograma nas datas correspondentes

### Feature: Board (sub-quadro)

- **Atributos:** layout (kanban, sprint, lista), colunas (nome, ordem)
- **Regra:** organiza os itens de topo de uma Cadeira, ou os itens-filho de um Item
- **Default:** criado com colunas padrão sugeridas (ex.: "A fazer / Em andamento / Concluído"),
  totalmente editável

### Cronograma (view — não é uma entidade persistida)

- **Geral:** agrega todos os itens (de qualquer cadeira/período) com data preenchida, incluindo
  instâncias geradas por Recorrência
- **Por cadeira:** mesma agregação, filtrada pela cadeira

## Diagrama (opcional)

_(a preencher — se fizer sentido, um diagrama ER simples pode ser adicionado aqui mais adiante)_
