# Visão Geral do Sistema

## O que é o sistema

Um gerenciador pessoal de tarefas, cronogramas, provas, projetos e trabalhos da graduação,
organizado hierarquicamente em **Período → Cadeira → Item**, com um cronograma unificado (e
cronogramas por cadeira), boards customizáveis (kanban, sprint, lista) e uma interface de IA que
permite criar, editar e excluir itens a partir de linguagem natural livre, sem exigir formato
estruturado.

## Problema que resolve / motivação

Centralizar tudo que o usuário precisa lembrar e estudar na faculdade em um único lugar altamente
customizável, reduzindo:
- o atrito de **registrar** essas informações (basta descrever em linguagem natural, na ordem que
  quiser, e a IA interpreta);
- o atrito de **visualizar** essas informações (cronograma geral, cronograma por cadeira, boards
  por cadeira e por item).

## Público-alvo / usuários

Uso exclusivamente pessoal do autor do projeto, estudante de graduação. Não é um produto
comercial nem será aberto ao público.

## Escopo

### Dentro do escopo

- Gestão manual de Períodos, Cadeiras e Itens (com aninhamento ilimitado de itens).
- Features plugáveis por item: Nota/Avaliação, Checklist, Anotações, Anexos, Recorrência, Board.
- Tags transversais (extensíveis pelo usuário).
- Cronograma geral e cronograma por cadeira (views agregadoras, não entidades).
- Boards customizáveis (kanban, sprint, lista) tanto no nível da Cadeira quanto no nível de um
  Item com filhos.
- Arquivamento e exclusão (soft delete / lixeira) em Período, Cadeira e Item.
- Interface de IA (barata/gratuita) para criação, edição e exclusão de itens via linguagem
  natural livre — sem exigir estrutura ou ordem fixa na frase.
- Homepage com visão "Hoje" / "próximos 7 dias".

### Fora do escopo (por agora)

- Ingestão automática / scraping de dados do sistema acadêmico (V2).
- Pré-validação da IA antes de aplicar a ação interpretada (release futura).
- Histórico de versões / auditoria completa de alterações (V2).
- Multiusuário / autenticação multiconta.

## Contexto de negócio

Projeto pessoal, não comercial, sem requisitos legais ou contratuais de terceiros. Liberdade
total de decisão de produto e arquitetura, priorizando as necessidades reais do próprio usuário
no dia a dia da graduação.

## Stakeholders

| Stakeholder | Papel / interesse |
|---|---|
| Usuário único (autor) | Estudante de graduação; usa o sistema no dia a dia para não perder prazos, provas e entregas, e para organizar o estudo por cadeira. |
