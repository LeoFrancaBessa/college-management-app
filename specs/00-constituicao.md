# Constituição do Projeto — Regras de Negócio Pétreas

> Regras imutáveis que não podem ser violadas por nenhuma funcionalidade, feature ou decisão técnica.
> Alterar algo neste documento exige decisão explícita e justificada — nunca um efeito colateral.

## Princípios do projeto

- Sistema de **uso exclusivamente pessoal** (single-user). Não há necessidade de multi-tenancy,
  múltiplos usuários ou controle de permissões — isso simplifica toda a arquitetura.
- **Ingestão de dados é manual**, feita pelo próprio usuário. A IA é uma *interface* de
  interpretação de linguagem natural para essa ingestão manual — não é um scraper e não busca
  dados automaticamente (isso fica para uma V2).
- **Máxima genericidade de dados.** Um único conceito — o `Item` — representa provas, tarefas,
  projetos, deadlines, eventos, aulas, etc. Comportamento especializado nasce de **features
  plugáveis** ativadas por item, nunca de subtipos rígidos "chumbados" no sistema.
- **Aninhamento ilimitado.** Um `Item` pode ter itens-filho, que podem ter seus próprios
  itens-filho, sem limite de profundidade.

## Regras de negócio pétreas

1. Hierarquia fixa: **Período → Cadeira → Item**, sendo que um `Item` pode conter `Itens`-filho
   recursivamente (aninhamento infinito).
2. **Cronograma nunca é uma entidade própria.** É sempre uma visão/agregador sobre itens com
   data preenchida — existe o cronograma **geral** (todos os itens) e o **por cadeira**
   (filtrado).
3. **Toda feature é opt-in por item.** Nota/Avaliação, Checklist, Anotações, Anexos,
   Recorrência e Board são plugáveis — nenhum tipo de item exige uma feature específica por
   definição do sistema.
4. **Tags são transversais** e independentes de Período/Cadeira — qualquer item pode receber
   qualquer tag, sem restrição hierárquica.
5. **Exclusão feita pela IA é sempre soft delete** (vai para a lixeira, recuperável por um
   período) — nunca exclusão definitiva direta.
6. **Arquivamento e exclusão são ações distintas**, disponíveis nos três níveis: Período,
   Cadeira e Item.
7. O sistema é **single-user**: não há modelagem de múltiplos usuários ou permissões no MVP.
8. Não existe regra de sobreposição ou sequência entre Períodos — o usuário tem liberdade total
   para criar quantos períodos quiser, sobrepostos ou não.
9. **A IA é uma via opcional de apoio, nunca a única via.** Toda ação que a IA executa
   (criar/editar/excluir Período, Cadeira ou Item) também deve poder ser feita manualmente pela
   interface — não pode existir funcionalidade exclusiva da IA.

## Restrições técnicas inegociáveis

- _(a definir na fase de arquitetura — ainda estamos fechando o produto)_

## Fora de discussão

> Decisões já tomadas que não devem ser reabertas sem motivo forte.

- **Ingestão automática (scraping)** de provas/cronogramas do sistema acadêmico da faculdade —
  fica para uma V2, não faz parte do MVP.
- **Pré-validação da IA** antes de aplicar criação/edição/exclusão — fica para uma release
  futura; no MVP a IA aplica a ação diretamente.
- **Histórico de versões / auditoria completa** de alterações — não entra no MVP.
- **Multiusuário / autenticação multiconta** — fora de escopo, o sistema é pessoal.
