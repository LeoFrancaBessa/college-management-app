# Casos de Uso

## Atores

- **Usuário** — ator único do sistema (uso pessoal). Interage tanto pela interface visual quanto
  por linguagem natural.
- **Assistente de IA** — não é um ator humano, é um componente do sistema que interpreta os
  comandos em linguagem natural do Usuário e executa criação/edição/exclusão em nome dele.

---

## UC-01 — Gerenciar Período

- **Ator(es):** Usuário
- **Pré-condições:** nenhuma (é a raiz da hierarquia).
- **Fluxo principal (criar):**
  1. Usuário aciona "Novo Período".
  2. Informa nome (e, opcionalmente, data de início/fim).
  3. Sistema cria o Período com status `ativo`.
- **Fluxos alternativos / exceções:**
  - **Editar:** altera nome/datas de um período existente.
  - **Arquivar:** período passa a `arquivado`; cadeiras e itens continuam acessíveis, mas o
    período some das listagens padrão de períodos ativos.
  - **Excluir:** ação deliberada e direta do usuário (não passa por lixeira — isso é exclusivo
    da exclusão via IA); sistema exige confirmação, pois cadeiras e itens vinculados também são
    removidos em cascata.
- **Pós-condições:** período criado, editado, arquivado ou excluído conforme a ação.
- **Regras de negócio relacionadas:** Regra pétrea 1 (hierarquia), Regra pétrea 6 (arquivamento
  e exclusão são ações distintas), Regra pétrea 8 (sem restrição de sobreposição entre
  períodos).

---

## UC-02 — Gerenciar Cadeira

- **Ator(es):** Usuário
- **Pré-condições:** existe ao menos um Período ativo.
- **Fluxo principal (criar):**
  1. Usuário seleciona um Período.
  2. Aciona "Nova Cadeira", informa nome (e descrição opcional).
  3. Sistema cria a Cadeira vinculada ao Período, com status `ativo` e um Board próprio já
     iniciado com colunas padrão sugeridas.
- **Fluxos alternativos / exceções:**
  - **Editar:** altera nome/descrição.
  - **Arquivar:** cadeira some das listas ativas, mas mantém histórico e itens acessíveis.
  - **Excluir:** remove a cadeira e todos os itens vinculados em cascata, com confirmação.
- **Pós-condições:** cadeira criada/atualizada, com Board inicial pronto para uso.
- **Regras de negócio relacionadas:** Regra pétrea 1, Regra pétrea 6; Board criado com colunas
  padrão sugeridas (ver `05-modelo-de-dominio.md`).

---

## UC-03 — Gerenciar Item manualmente

- **Ator(es):** Usuário
- **Pré-condições:** existe ao menos uma Cadeira ativa (para item de topo) ou um Item existente
  (para item-filho).
- **Fluxo principal (criar item de topo):**
  1. Usuário seleciona a Cadeira.
  2. Aciona "Novo Item", informa título e tipo (escolhendo da lista extensível de Tipos de Item
     ou cadastrando um novo tipo).
  3. Opcionalmente informa data/prazo.
  4. Sistema cria o Item vinculado à Cadeira.
- **Fluxos alternativos / exceções:**
  - **Criar item-filho:** a partir de um Item existente, usuário aciona "Adicionar item-filho";
    mesmo preenchimento de título/tipo/data; sistema vincula o novo item como filho do item
    selecionado (herdando a cadeira do item raiz).
  - **Editar:** altera título, tipo ou data.
  - **Reparentar:** move um item para debaixo de outro item pai (ou para item de topo).
  - **Arquivar:** item some das listas ativas, mantendo histórico.
  - **Excluir:** ação direta e deliberada do usuário, com confirmação — diferente da exclusão
    via IA, que é sempre soft delete.
- **Pós-condições:** item criado, atualizado, movido, arquivado ou excluído.
- **Regras de negócio relacionadas:** Regra pétrea 1 (aninhamento ilimitado), invariante "item
  não pode ser pai de si mesmo" (`05-modelo-de-dominio.md`), Regra pétrea 6.

---

## UC-04 — Criar / editar / excluir Item via linguagem natural (IA)

- **Ator(es):** Usuário, Assistente de IA
- **Pré-condições:** existe ao menos uma Cadeira (a IA precisa conseguir associar o comando a
  uma cadeira, por nome ou contexto).
- **Fluxo principal (criação):**
  1. Usuário digita um comando livre, em qualquer ordem e formato (ex.: *"A cadeira de
     matemática 3 terá uma prova dia 27/08/2026, adicione isso ao cronograma"*).
  2. A IA interpreta o texto e extrai cadeira, tipo de item, data e título.
  3. Sistema cria o Item automaticamente com os dados extraídos, **sem pedir confirmação
     prévia** (decisão registrada em "fora de discussão").
  4. O item criado aparece imediatamente no cronograma geral e no da cadeira correspondente.
- **Fluxos alternativos / exceções:**
  - **Edição:** usuário descreve a alteração (ex.: *"mude a prova de matemática 3 para dia
    28/08"*); a IA localiza o item existente (por cadeira + tipo + proximidade de data/título) e
    aplica a edição.
  - **Exclusão:** usuário descreve o critério (ex.: *"apague tudo que for no período de
    01/09/2026 até 08/09/2026"*); a IA localiza os itens que casam com o critério e os marca como
    `lixeira` (soft delete) — nunca exclusão definitiva direta.
  - **Interpretação sem confiança suficiente:** a IA não consegue identificar a cadeira/item
    referenciado, ou não conseguiu gerar nenhuma ação concreta a partir do comando → sistema
    **não executa nenhuma ação**, avisa que não entendeu e pede para o usuário explicar melhor
    (evita aplicar algo errado silenciosamente).
- **Pós-condições:** item(ns) criado(s), editado(s) ou movido(s) para a lixeira, conforme o
  comando — ou nenhuma alteração, no caso de não-entendimento.
- **Regras de negócio relacionadas:** Regra pétrea 5 (exclusão via IA é sempre soft delete);
  Regra pétrea 9 (IA é uma via opcional de apoio); "fora de discussão" — sem pré-validação da
  IA no MVP.

---

## UC-05 — Ativar e preencher Feature em um Item

- **Ator(es):** Usuário
- **Pré-condições:** item existente.
- **Fluxo principal:**
  1. Usuário abre o item e escolhe quais features ativar (Nota, Checklist, Anotações, Anexos,
     Recorrência) — pode ativar quantas quiser; nenhuma é obrigatória.
  2. Preenche os dados específicos de cada feature ativada (nota obtida/máxima/peso; itens da
     checklist; texto de anotação; upload de anexos; regra de recorrência).
  3. Sistema salva os dados da feature vinculados ao item.
- **Fluxos alternativos / exceções:**
  - **Desativar feature:** dados da feature ficam ocultos; remoção definitiva exige confirmação
    explícita.
- **Pós-condições:** item passa a exibir as features ativadas e seus dados.
- **Regras de negócio relacionadas:** Regra pétrea 3 (features são opt-in por item).

---

## UC-06 — Configurar e usar Board (da Cadeira ou de um Item)

- **Ator(es):** Usuário
- **Pré-condições:** cadeira existente (Board da cadeira) ou item com feature Board ativada e
  ao menos um item-filho.
- **Fluxo principal:**
  1. Usuário abre o Board — da cadeira (organiza os itens de topo) ou de um item (organiza seus
     itens-filho).
  2. Board já vem com colunas padrão sugeridas (ex.: "A fazer / Em andamento / Concluído").
  3. Usuário customiza colunas (renomear, reordenar, adicionar, remover) e escolhe o layout
     (kanban, sprint, lista).
  4. Usuário arrasta/move itens entre colunas para refletir o progresso.
- **Pós-condições:** board configurado conforme a preferência do usuário para aquela
  cadeira/item.
- **Regras de negócio relacionadas:** Board com colunas padrão sugeridas; Board pode existir
  tanto no nível de Cadeira quanto de Item (`05-modelo-de-dominio.md`).

---

## UC-07 — Visualizar Cronograma (Geral e por Cadeira)

- **Ator(es):** Usuário
- **Pré-condições:** existem itens com data preenchida.
- **Fluxo principal:**
  1. Usuário acessa o Cronograma Geral e visualiza todos os itens com data (de qualquer
     período/cadeira), incluindo instâncias geradas por Recorrência.
  2. Usuário alterna para o Cronograma de uma Cadeira específica, vendo apenas os itens daquela
     cadeira.
- **Pós-condições:** nenhuma alteração de dados, apenas visualização.
- **Regras de negócio relacionadas:** Regra pétrea 2 (cronograma nunca é entidade própria, é
  sempre agregador).

---

## UC-08 — Visualizar Homepage (Hoje / Próximos 7 dias)

- **Ator(es):** Usuário
- **Pré-condições:** existem itens com data preenchida.
- **Fluxo principal:**
  1. Usuário abre o sistema e a Homepage já exibe os itens com data para hoje e para os próximos
     7 dias, agregando todas as cadeiras/períodos ativos.
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio relacionadas:** decisão de produto — homepage é a visão "Hoje / Próximos
  7 dias".

---

## UC-09 — Gerenciar Tags em Itens

- **Ator(es):** Usuário
- **Pré-condições:** item existente.
- **Fluxo principal:**
  1. Usuário aplica uma ou mais tags a um item, escolhendo entre as tags existentes ou criando
     uma nova.
  2. Usuário remove tags de um item a qualquer momento.
- **Pós-condições:** item passa a ter (ou deixa de ter) as tags selecionadas.
- **Regras de negócio relacionadas:** Regra pétrea 4 (tags transversais, lista extensível).

---

## UC-10 — Consultar média da Cadeira

- **Ator(es):** Usuário
- **Pré-condições:** cadeira com ao menos um item com a feature Nota ativada e nota lançada.
- **Fluxo principal:**
  1. Usuário abre a Cadeira.
  2. Sistema calcula e exibe a média ponderada (pelo peso) de todos os itens da cadeira com a
     feature Nota ativada e nota lançada.
- **Fluxos alternativos / exceções:**
  - Nenhum item com nota lançada → sistema exibe "sem notas lançadas" em vez de uma média.
- **Pós-condições:** nenhuma alteração de dados, apenas cálculo/exibição.
- **Regras de negócio relacionadas:** regra da feature Nota/Avaliação (`05-modelo-de-dominio.md`).

---

## UC-11 — Restaurar item da Lixeira

- **Ator(es):** Usuário
- **Pré-condições:** existe ao menos um item em status `lixeira` (excluído via IA) dentro do
  período de retenção.
- **Fluxo principal:**
  1. Usuário acessa a Lixeira.
  2. Localiza o item excluído indevidamente (ex.: por um comando de IA mal interpretado).
  3. Aciona "Restaurar"; sistema volta o item ao status `ativo`, na cadeira/pai original.
- **Fluxos alternativos / exceções:**
  - Item passou do período de retenção → sistema não permite mais restaurar.
- **Pós-condições:** item restaurado, ou definitivamente perdido, conforme o caso.
- **Regras de negócio relacionadas:** Regra pétrea 5 (exclusão via IA é sempre soft delete).
