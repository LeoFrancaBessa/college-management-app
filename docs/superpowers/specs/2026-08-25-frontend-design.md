# Frontend — Design Spec (MVP)

> **Data:** 2026-08-25
> **Status:** aguardando revisão do autor antes do plano de implementação
> **Stack:** React 19 + Vite + TypeScript + React Router 7 + TanStack Query 5 + Tailwind + dnd-kit + FullCalendar (tudo já em `frontend/package.json`)
> **Tema MVP:** branco + rosa claro `#fb93d7` como primária
> **Princípios do produto (reafirmados):** dashboard-first como hub (Seção 2b), IA via overlay global `Cmd/Ctrl+K` (2b) acessível de qualquer rota, página do Item com seções colapsáveis por feature opt-in (3a), Lista como visão padrão da Cadeira com abas `Lista | Board | Cronograma`, minimalista funcional com **paridade total mobile** (50% do uso) — toda funcionalidade de desktop existe no celular com adaptação de interação.

---

## 1. Objetivo e critério de sucesso

Entregar o frontend MVP que permite ao usuário (single-user) gerenciar todo o ciclo **Período → Cadeira → Item** e suas features plugáveis, visualizar cronograma e boards, e usar a IA de linguagem natural — em desktop e celular — sem exigir conhecimento de frontend do autor para manter/evoluir.

**Critérios de sucesso (observáveis):**
- Autenticar (login/logout) e navegar Dashboard, Período, Cadeira (3 abas), Item, Cronograma geral, Lixeira sem erro 401 fora do fluxo de auth.
- CRUD completo de Período, Cadeira, Item (inclui filho, reparentar via mover, arquivar, excluir com confirmação) e Tipo de Item.
- Ativar/desativar e preencher cada feature plugável do Item (Nota, Checklist, Anotações, Anexos, Recorrência, sub-Board) e ver reflexo em média da cadeira e cronograma.
- Board da cadeira e sub-board de item: criar/reordenar/renomear/remover colunas, trocar layout, mover item entre colunas (drag no desktop, menu no mobile).
- Cronograma geral e por cadeira reflete `due_date` + expansão de recorrência; Homepage "Hoje / Próximos 7 dias" correta.
- IA via `Cmd+K` global: comando livre cria/edita/exclui (soft delete) e exibe feedback; comando vago retorna "não entendi" sem side-effect (RF-36).
- Tags: criar, aplicar, remover, filtrar visualmente.
- Lixeira: listar e restaurar.
- Export/import JSON acessível (pode ser ação na Dashboard/Lixeira no MVP).
- Responsivo: todas as ações acima realizáveis no celular com navegação por bottom-nav e sem drag obrigatório.

Fora deste MVP: ingestão automática, pré-validação da IA, histórico de versões, multiusuário, CI/CD.

---

## 2. Arquitetura e fundação

### 2.1 Stack e decisões

- **Sem estado global adicional.** `React Router` é fonte de verdade de navegação; `TanStack Query` é fonte de verdade de dado remoto (cache, invalidação, retry). Sem Zustand/Redux.
- **Auth via cookie httpOnly.** Frontend nunca lê/escreve token em JS. Todo `fetch` usa `credentials: 'include'`; `Secure`/`SameSite` são controlados pelo backend.
- **Tailwind** para estilo (candidato já em `docs/architecture.md`). Sem kit de UI opinativo no MVP; componentes genéricos próprios em `components/ui`.
- **Lazy por rota/feature pesada.** `BoardView` e `ScheduleCalendar` são `React.lazy` para não inflar bundle inicial.

### 2.2 Estrutura de pastas (nova)

```
frontend/src/
  api/
    client.ts        # fetch wrapper (baseURL, credentials, 401 handling)
    types.ts         # tipos espelhando schemas Pydantic
    auth.ts          # hooks: useMe, useLogin, useLogout
    periods.ts       # usePeriods, usePeriod, mutações
    courses.ts       # useCourses, useCourse, useCourseAverage
    items.ts         # useItems, useItem, mutações (create/update/archive/delete/move/tags/board)
    itemTypes.ts     # useItemTypes
    boards.ts        # useBoard, mutações de coluna/layout
    schedule.ts      # useSchedule, useHomepage
    tags.ts          # useTags
    trash.ts         # useTrash, restore
    attachments.ts   # upload/list/download/delete
    ai.ts            # useAIInterpret
    export.ts        # export/import
  routes/
    Login.tsx
    Dashboard.tsx
    PeriodDetail.tsx
    CourseDetail.tsx  # contém Tabs Lista|Board|Cronograma
    ItemDetail.tsx
    SchedulePage.tsx  # cronograma geral
    TrashPage.tsx
  components/
    layout/
      AppShell.tsx       # Sidebar (lg) + BottomNav (mobile) + CommandPalette global
      Sidebar.tsx
      BottomNav.tsx
      CommandPalette.tsx # overlay Cmd+K
    ui/
      Button.tsx, Card.tsx, Badge.tsx, Tabs.tsx, ConfirmDialog.tsx,
      Toast.tsx, Skeleton.tsx, EmptyState.tsx
    board/
      BoardView.tsx, BoardColumn.tsx, ItemCard.tsx
    schedule/
      ScheduleCalendar.tsx
    item/
      FeatureSection.tsx, ChecklistEditor.tsx, NotesEditor.tsx, GradeFields.tsx,
      RecurrenceFields.tsx, AttachmentList.tsx
  lib/
    queryClient.ts
    formatDate.ts
    pagination.ts
```

### 2.3 Config e ambiente

- `VITE_API_URL` (opcional): em dev, `vite.config.ts` faz `proxy: { '/api': 'http://localhost:8000' }` para evitar CORS; em prod Caddy serve mesma origem e `VITE_API_URL` fica vazio (path relativo).
- `tailwind.config` estende `colors.primary = '#fb93d7'`, `primary-50: #fff0f8`, `primary-100: #ffe4f2`.

---

## 3. Navegação, rotas e layout

### 3.1 Rotas

| Rota | Página | Acesso | Fonte de dados principal |
|------|--------|--------|--------------------------|
| `/login` | Login | pública | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| `/` | Dashboard (hub) | privada | `GET /api/v1/schedule/homepage`, listas curtas de períodos/cadeiras |
| `/periodos/:periodId` | Período | privada | `GET /api/v1/periods/:id`, `GET /api/v1/courses?period_id=:id` |
| `/cadeiras/:courseId` | Cadeira — Tabs | privada | `GET /api/v1/courses/:id`, `GET /api/v1/courses/:id/average`, filhos por tab |
| `/itens/:itemId` | Item | privada | `GET /api/v1/items/:id`, `GET /api/v1/item-types`, `GET /api/v1/tags` |
| `/cronograma` | Cronograma geral | privada | `GET /api/v1/schedule` (+ filtros) |
| `/lixeira` | Lixeira | privada | `GET /api/v1/trash` |
| `*` | redirect `/` | — | — |

**Tab da cadeira via query:** `/cadeiras/:id?tab=lista|board|cronograma`, default `lista`. Trocar de aba faz `navigate({search})` sem recarregar; refresh/deeplink preserva.

### 3.2 AppShell e navegação responsiva

- **Desktop `lg:`:** sidebar fixa 260px à esquerda (logo, Dashboard, Cronograma, Lixeira, lista curta de Períodos com cadeiras aninhadas, usuário/logout). Conteúdo central `max-w-5xl` com `px-6 py-6`.
- **Mobile `<lg`:** top bar (`h-14`, título da rota + avatar/menu) + **BottomNav fixo** com 4 itens: Dashboard, Cadeiras, Cronograma, botão `+` que abre `CommandPalette`. Sidebar vira drawer opcional se necessário, mas não é navegação primária no mobile.
- **Breadcrumb** `Período > Cadeira > Item` apenas em `PeriodDetail`, `CourseDetail`, `ItemDetail`; Dashboard não tem breadcrumb.
- **Tema:** fundo `white` / `gray-50` para áreas secundárias, bordas `gray-200`, cards `white` com `shadow-sm`. Primária `#fb93d7` só em CTA, aba ativa, badge selecionado, `ring`/foco e highlight de "hoje" no calendário; hover escurece ~8% para contraste.

### 3.3 Auth e guarda de rota

- `useMe` (`GET /api/v1/auth/me` com `retry: false`) no `AppShell`. Se 401 e rota ≠ `/login`, `navigate('/login', {replace:true})`. `Login` em sucesso faz `invalidate(['me'])` + `navigate('/')`.
- `POST /api/v1/auth/logout` e `POST /api/v1/auth/logout-all` limpam cache (`queryClient.clear()`).
- Nenhum token em `localStorage`.

---

## 4. Dados, API client e cache

### 4.1 Client HTTP (`api/client.ts`)

```ts
// esqueleto — credenciais e tratamento 401 centralizado
const BASE = import.meta.env.VITE_API_URL ?? '';
export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init.headers as object) } });
  if (res.status === 401) { /* invalidate me + redirect — sem throw genérico */ }
  if (!res.ok) throw await toApiError(res);
  return res.json();
}
```

- `toApiError` extrai `{detail}` (string ou array Pydantic) para mensagem por campo.
- Upload de anexos usa `FormData` sem `Content-Type` JSON.

### 4.2 TanStack Query

- `queryClient` com `staleTime: 30_000`, `retry: 1` (não retry em 401), `refetchOnWindowFocus: false`.
- **Chaves:**
  - `['me']`
  - `['periods', {status, include_archived, limit, offset}]`
  - `['period', id]`
  - `['courses', {periodId, status, limit, offset}]`, `['course', id]`, `['courseAverage', id]`
  - `['items', {courseId, parentId, status, include_archived, include_trash, limit, offset}]`, `['item', id]`
  - `['itemTypes']`, `['tags']`, `['boards', boardId]`
  - `['schedule', {courseId, from, to, limit, offset}]`, `['homepage']`
  - `['trash', {courseId}]`
- **Invalidação por mutação:**
  - `create/update/archive/delete item` → `invalidate(['items'])` + `['schedule']` + `['homepage']` + `['courseAverage']` quando afeta `grade`.
  - `move item / put board-column` → `['boards']` + `['items']`.
  - `board column/layout` → `['boards']`.
  - `ai interpret` → `['items','schedule','homepage','trash']` se houve `created/edited/trashed`.
  - `trash restore` → `['trash']` + `['items','schedule']`.

### 4.3 Paginação e filtros

- Hooks de lista aceitam `{limit, offset}` opcionais → query params `?limit` (1..100) `?offset` (>=0, validado no backend com 422). Sem params = retorna tudo (compatível).
- **MVP:** Dashboard e Lista da Cadeira carregam sem paginação; Cronograma/Schedule usa "Carregar mais" (incrementa `offset` por `limit`, concatena). Paginação numerada fica pós-MVP.
- Filtros de status: lista ativa chama sem param (backend default só ACTIVE); toggle "Arquivados" adiciona `?include_archived=true`; Lixeira é rota separada (`GET /api/v1/trash`).

### 4.4 Tipos (`api/types.ts`)

Espelha Pydantic sem duplicar validação:
`Period {id,name,status, start_date?, end_date?}`, `Course {id, period_id, name, description?, status, board_id}`, `Item {id, course_id, parent_id?, item_type_id, title, due_date?, status, board_column_id?, board_id?, features: {grade?, checklist?, notes?, recurrence?}, tags: Tag[]}`, `Board {id, course_id?, item_id?, layout, columns: BoardColumn[]}`, `Tag`, `ItemType`, `ScheduleItem` (Item com `due_date` expandido).

---

## 5. Telas e fluxos

### 5.1 Dashboard `/` (hub — prioridade do spec)

- **Bloco "Hoje"** + **"Próximos 7 dias"** via `GET /api/v1/schedule/homepage`. Cada card: título, cadeira (nome), horário, badges de tag (com cor), chips de feature (`📝 2/5`, `⭐ 8.5/10`, `🔁`, `📎 2`). Clique → `/itens/:id`.
- Vazio → `EmptyState` com CTA "Crie seu primeiro período" + "ou use `Ctrl+K`".
- **Atalhos:** lista curta de Períodos (com cadeiras aninhadas) + botões "Novo Período", "Nova Cadeira", "Novo Item". Cada atalho navega para a rota correspondente.
- Ações rápidas: arquivar/excluir período/cadeira via `ConfirmDialog` (texto avisa cascata).

### 5.2 Período `/periodos/:periodId`

- Header: nome editável inline, datas início/fim (date inputs opcionais), status, ações Arquivar/Excluir.
- Lista de Cadeiras do período (`GET /api/v1/courses?period_id=:id`), card com nome, descrição curta, média (`GET /api/v1/courses/:id/average` — exibe "sem notas" quando `average == null`), contagem de itens. Criar cadeira inline (nome + descrição) → `POST /api/v1/courses`.

### 5.3 Cadeira `/cadeiras/:courseId` — Tabs

**Tabs `Lista | Board | Cronograma`** controladas por `?tab=`.

- **Lista (default):**
  - `GET /api/v1/items?course_id=:id` (sem paginação no MVP), ordenados por `created_at desc` como backend retorna.
  - Cada linha: título, tipo, data, coluna atual (se board existir), tags, menu `•••` (editar data, mover de coluna, arquivar, excluir). Botão "Novo item" no topo → `POST /api/v1/items {course_id, title, item_type_id, due_date?, parent_id?}`.
  - Hierarquia: item expande filhos inline 1 nível (`GET /api/v1/items?parent_id=:id`); "ver detalhes" → `/itens/:id` para profundidade total. Reparentar via menu "Mover para..." → `POST /api/v1/items/:id/move {parent_id}` com guard anti-ciclo (erro 400 exibido inline).

- **Board (`?tab=board`):**
  - `GET /api/v1/boards/:boardId` (boardId vem de `course.board_id`). Colunas droppables com cards dos itens de topo.
  - Ações de coluna/layout em botão engrenagem: renomear, adicionar, remover (backend recusa remover última coluna — toast), reordenar, `PATCH /api/v1/boards/:id {layout: kanban|sprint|lista}`. Layout `lista` empilha colunas verticalmente.
  - Mover item entre colunas → `PUT /api/v1/items/:id/board-column {board_column_id}` (ou `POST /items/:id/board-column` conforme backend).

- **Cronograma (`?tab=cronograma`):**
  - `ScheduleCalendar` filtrado por `course_id` (`GET /api/v1/schedule?course_id=:id&from=&to=&limit=&offset=`), views mês/semana/lista; clique no evento → `/itens/:id`; clique em dia vazio → abre criação com `due_date` do dia.

### 5.4 Item `/itens/:itemId`

- **Header:** título editável inline, tipo (`Select` de `GET /api/v1/item-types`, com "criar novo tipo" inline → `POST /api/v1/item-types`), data/prazo (date/datetime picker), breadcrumb, status, ações Arquivar (`POST /api/v1/items/:id/archive`) / Excluir (`DELETE /api/v1/items/:id`) com `ConfirmDialog`.
- **Edição:** `PATCH /api/v1/items/:id` com payload parcial; otimista local + invalidação.
- **Seções colapsáveis (todas fechadas por default exceto a que tem dado):** cada seção é opt-in — ativar cria chave em `features`, desativar remove (com confirmação). Validação exibida sob o campo quando backend retorna 400 (ex.: `score > max_score`).

| Seção | Campos | API |
|-------|--------|-----|
| **Nota** | score, max_score (default 10), weight (default 1) | `features.grade` (`validate_grade`, alias `nota` normalizado) |
| **Checklist** | lista `[{text 1..500 trimmed, done bool}]` max 100, add/remove/toggle | `features.checklist` |
| **Anotações** | textarea markdown + preview simples | `features.notes` (0..50000) |
| **Anexos** | upload (multipart, 20MB, qualquer mime), lista, download, delete | `POST /api/v1/items/:id/attachments`, `GET /api/v1/items/:id/attachments`, `GET /api/v1/attachments/:id`, `DELETE` |
| **Recorrência** | frequency `daily|weekly|monthly|yearly`, interval 1..366, weekdays [0..6] só weekly, `until` OU `count` (1..500), requer `due_date` | `features.recurrence` (`validate_recurrence`, aviso "aparecerá no cronograma") |
| **Sub-Board** | toggle "ativar board neste item" → cria `POST /api/v1/items/:id/board` e mostra mini-board dos filhos | `board` feature |

- **Rodapé do item:** lista de filhos (criar filho inline) + tags (chips com cor, add/remove via `PUT /api/v1/items/:id/tags` e `DELETE /:id/tags/:tagId`; criar tag via `POST /api/v1/tags`).

### 5.5 Cronograma geral `/cronograma` e Lixeira `/lixeira`

- **Cronograma geral:** `ScheduleCalendar` sobre `GET /api/v1/schedule` (+ `from`/`to`/`limit`/`offset`), filtro opcional por cadeira via `Select` (reuso de `GET /api/v1/courses`). Recorrências já expandidas pelo backend — frontend só renderiza. Timezone UTC (backend normaliza naive como UTC).
- **Lixeira:** `GET /api/v1/trash` (opcional `?course_id`), botão Restaurar → `POST /api/v1/trash/:id/restore` (subtree volta a ACTIVE); aviso "retenção 30 dias — expiração automática".

### 5.6 Export/Import

- Ação em Dashboard ou Lixeira: "Exportar JSON" → `GET /api/v1/export` (download); "Importar" → `POST /api/v1/import` com file picker (JSON). Toast de sucesso/erro.

---

## 6. IA — Command Palette global (`Cmd/Ctrl+K`)

- **Montagem:** componente único em `AppShell`, acessível de qualquer rota. Atalho `Ctrl+K` / `Cmd+K`, botão flutuante `+` no mobile (BottomNav), `Esc` fecha. Não é rota; é overlay com backdrop.
- **UI:** input grande com placeholder "Descreva o que quer criar, editar ou excluir em linguagem natural…", botão Enviar, histórico do último comando (texto) quando reaberto, área de feedback.
- **Fluxo:**
  - `POST /api/v1/ai/interpret {text}` → `{understood: bool, message: string, created_items?: Item[], edited_items?: Item[], trashed_items?: Item[]}`.
  - Sucesso (`understood:true`): exibe `message` + lista de itens com links para `/itens/:id`; invalida `['items','schedule','homepage','trash']`.
  - Falha (`understood:false`, RF-36): exibe "não entendi, pode explicar melhor?" sem side-effect; mantém texto para refinar; nenhuma invalidação.
  - Sem `GEMINI_API_KEY` ou erro de rede/Gemini: mensagem clara + retry.
- **Loading:** spinner + "interpretando…".
- **Observação:** sem pré-confirmação no MVP (conforme "fora de discussão" em `00-constituicao.md`); log técnico `text → response` já existe no backend.

---

## 7. Board interativo e Cronograma (detalhes de interação)

### 7.1 Board

- **Desktop:** `dnd-kit` (`DndContext` + `SortableContext` por coluna). `onDragEnd` calcula `board_column_id` destino → `PUT /api/v1/items/:id/board-column`; otimista movendo card na UI, rollback em erro + toast. Colunas reordenáveis via handle; `Sortable` com `verticalListSortingStrategy` dentro de cada coluna.
- **Mobile (paridade total):** drag desabilitado quando `pointer: coarse` (media query); cada card tem menu "Mover para…" (`Select` de colunas do board) que chama o mesmo endpoint. Customizar colunas/layout abre `Sheet` inferior (bottom sheet) com renomear/adicionar/remover e seletor `kanban|sprint|lista`. Todas as mutações de board disponíveis no mobile.
- **Layout `lista`:** colunas empilhadas verticalmente (útil no celular e para quem prefere lista).

### 7.2 Cronograma (`FullCalendar`)

- Views `dayGridMonth` + `timeGridWeek` + `listWeek`. Timezone `UTC`.
- Clique em evento → `/itens/:id`; clique em dia vazio → criação com `due_date` do dia (pré-preenche `course_id` quando dentro de `CourseDetail`).
- Mobile inicia em `listWeek`, desktop em `dayGridMonth`; preferência persistida em `localStorage` (`schedule.view`).
- Paginação "Carregar mais" quando `limit`/`offset` retornam lote cheio.

---

## 8. Responsividade, tema, erros e estados

### 8.1 Responsividade (requisito: paridade total, não degradação)

- Breakpoints `sm:640 / lg:1024`.
- Touch targets ≥44px, listas com `py-3` e área de clique ampliada; menu `•••` sempre visível no mobile (sem hover).
- Tabelas/listas nunca quebram layout; overflow horizontal quando necessário.
- Imagens/anexos com `max-width: 100%`.

### 8.2 Tema

- `tailwind.config`:
  ```js
  colors: { primary: '#fb93d7', 'primary-50': '#fff0f8', 'primary-100': '#ffe4f2', gray: colors.gray }
  ```
- Primária só em CTA, aba ativa, badge selecionado, `focus:ring-primary`, highlight de hoje no calendário; texto `gray-900`, bordas `gray-200`, fundo `white`/`gray-50`.

### 8.3 Erros, vazio e loading

- **Loading:** skeletons por lista/card; Board e Cronograma com `Suspense`.
- **Vazio:** `EmptyState` com CTA contextual ("Nenhum item nesta cadeira — Criar item / `Ctrl+K`").
- **Erros:**
  - 401 → redirect `/login` (exceto quando já em `/login`).
  - 400/422 de `features` → mensagem inline sob o campo da seção (ex.: "nota não pode ser maior que a máxima", "texto do checklist não pode ser vazio").
  - 404 → página "não encontrado" com voltar.
  - Rede → toast com retry.
  - `ConfirmDialog` para exclusões em cascata (texto: "cadeiras e itens vinculados também serão removidos").
- **Toasts:** sucesso/erro com auto-dismiss 4s.

---

## 9. Testes (MVP pragmático)

- **Stack:** `Vitest + React Testing Library` (sem MSW no MVP; `vi.mock` de `api/client`).
- **Cobertura alvo:** fluxos críticos, não exaustão (backend já tem 92%):
  - `CommandPalette` — RF-36 sem side-effect quando `understood:false`, invalidação quando `true`.
  - `ItemDetail` — seções Nota/Checklist/Anotações (ativar, validar 400, desativar).
  - `BoardView` — mover item entre colunas (mock do endpoint), customizar coluna (remover última → erro).
  - `ScheduleCalendar` — render de eventos e clique → navegação.
  - `AppShell` — redirect 401 para `/login`, BottomNav presente em mobile.
- **Critério de aceite de teste:** `pnpm test -- --run` passa em CI local; sem flake por timezone (usar UTC fixo).

---

## 10. Fora de escopo neste spec

- Ingestão automática/scraping, pré-validação da IA, histórico de versões, multiusuário.
- Design system opinativo (shadcn/ui) e animações avançadas — viram polish pós-MVP sem refatorar rotas.
- Paginação numerada e optimistic updates sofisticados por entidade (B seria overkill para single-user).
- `shadcn`, `zustand`, `msw` — não entram no MVP.

---

## 11. Riscos e notas de implementação

- **Paridade mobile real exige fallback sem drag.** Testar em device real/emulador com `pointer: coarse`; não confiar só em resize.
- **Recorrência + Cronograma:** frontend não expande; confia em `schedule_service.list_schedule`. Recorrência corrompida já tem fallback no backend (trata como item simples).
- **Features JSONB:** frontend envia shape canônico (`grade`, `checklist`, `notes`, `recurrence`); alias legado (`nota`, `anotacoes`) só existe no backend para compatibilidade.
- **Anexos:** volume `attachments:/app/attachments` no `docker-compose.yml`; download via `FileResponse` com `Content-Disposition`.
- **Vite proxy:** sem ele, `fetch` de `localhost:5173 → :8000` exige CORS; proxy elimina o problema em dev.

---

## 12. Self-review do spec

- [x] Sem `TBD`/`TODO` ou seção incompleta.
- [x] Arquitetura (Seção 2) consistente com features (Seção 5) e dados (Seção 4) — chaves de Query e endpoints batem com `backend/app/api/v1/router.py`.
- [x] Escopo cabe em um único ciclo de implementação (um plano, sem decomposição em sub-projetos).
- [x] Requisitos sem ambiguidade dupla: tema `#fb93d7`, navegação `?tab=`, paginação `?limit/?offset`, `credentials: 'include'` explícitos.
- [x] Mobile como paridade (não degradação) reforçado em Seções 7.1 e 8.1.
