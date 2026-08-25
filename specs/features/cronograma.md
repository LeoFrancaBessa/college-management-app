# Feature: Cronograma e Homepage

> Spec detalhada de RF-30 / RF-31 / RF-32. Deriva de `specs/04-funcionalidades.md:51`, `specs/03-casos-de-uso.md:67` (UC-07/UC-08), `specs/05-modelo-de-dominio.md:52` e Regra pétrea 2 (`specs/00-constituicao.md:12`).

## Objetivo

Entregar a **view agregadora Cronograma** (nunca entidade persistida) e a **Homepage Hoje / Próximos 7 dias** como agregações puras sobre `Item.due_date`. É o primeiro valor visível do MVP antes de Auth/IA.

## Escopo (RFs / UCs)

- **RF-30** — Cronograma geral (todos os itens com data, incluindo futuras instâncias de recorrência)
- **RF-31** — Cronograma por cadeira (filtrado por `course_id`)
- **RF-32** — Homepage Hoje / Próximos 7 dias (`UC-08`)
- Casos de uso: **UC-07** Visualizar Cronograma, **UC-08** Visualizar Homepage
- Regras: Regra 2 (cronograma nunca é entidade), `Item.status` (`active | archived | trash` — `specs/05-modelo-de-dominio.md:18`)

## Fora de escopo desta entrega

- Expansão de **Recorrência** (RF-20 / `features.recurrence`) — fica como `TODO` e retorna só `due_date` base.
- Paginação / ordenação custom — sempre `due_date ASC, id ASC`.
- Filtro por `period_id`, `tag`, `status` arbitrário — só `course_id` + janela `from/to` nesta V1.
- Frontend (FullCalendar) — só API.

## Modelo / invariantes

- Fonte única: `items` onde `due_date IS NOT NULL` **e** `status == active`. Itens `archived` e `trash` (`ItemStatus.TRASH` — `backend/app/models/enums.py:17`, `deleted_at` `backend/app/models/item.py:54`) **não aparecem**.
- Ordenação cronológica `due_date ASC` (estável por `id ASC` em empate).
- Sem tabela `schedules`; sem `deleted_at` envolvido além do filtro de `status`.
- `features` JSON não afeta o cronograma nesta entrega (exceto quando RF-20 for implementado).

## API

```
GET /api/v1/schedule
  ?course_id=int   // RF-31 — filtra por cadeira
  &from_date=datetime (ISO-8601, inclusive)
  &to_date=datetime   (inclusive)
  → 200 list[ScheduleItemRead] ordenada

GET /api/v1/schedule/homepage
  → 200 list[ScheduleItemRead] janela [today 00:00 UTC, today+7d 23:59:59.999999 UTC]
```

`ScheduleItemRead` (`backend/app/schemas/schedule.py:10`) espelha `ItemRead` mas é schema dedicado (evolução desacoplada): `id, title, due_date!, status, course_id, parent_id, features, created_at, updated_at, item_type, tags`.

Erros: `200` sempre (lista vazia se nada casa); `course_id` inexistente retorna lista vazia (não 404) — é filtro, não recurso.

## Regras de negócio

1. Item sem `due_date` nunca entra no cronograma.
2. Item arquivado ou em lixeira nunca entra (mesmo com `due_date`).
3. Item-filho com `due_date` entra normalmente (herda `course_id` do pai — `backend/app/services/item_service.py:60`).
4. Recorrência: até RF-20 existir, **nenhuma expansão** — listar só `due_date` armazenado; código deve conter `TODO(RF-20)`.
5. Homepage agrega **todas** as cadeiras/períodos; janela é UTC day boundaries, injetável via `now` para testes.

## Critérios de aceite

- [ ] `GET /schedule` retorna todos os `Item`s ativos com `due_date`, ordenados `due_date ASC`.
- [ ] `GET /schedule?course_id=X` retorna só os daquela cadeira.
- [ ] `GET /schedule?from_date=&to_date=` filtra inclusive.
- [ ] `GET /schedule/homepage` retorna só `[today 00:00, +7d 23:59]`; item em `+8d` fica fora; item de ontem fica fora.
- [ ] Itens sem `due_date` não retornam.
- [ ] Itens `archived`/`trash` não retornam.
- [ ] Sem entidade `Schedule` criada; `GET /schedule` não cria efeitos colaterais.
- [ ] `TODO(RF-20)` presente no service.

## Casos de borda

- `due_date` com timezone diferente — comparar em UTC (coluna `DateTime(timezone=True)`).
- `from_date > to_date` → lista vazia (não erro).
- `course_id` sem itens com data → `[]`.
- Item movido de cadeira (`POST /items/{id}/move`) passa a aparecer no cronograma da nova cadeira — coberto por `course_id` ser fonte.
- Homepage em virada de dia: `now` injetável evita flake.

## Arquivos

- `backend/app/services/schedule_service.py:1` — `_base_query`, `list_schedule`, `get_homepage(now?)`
- `backend/app/schemas/schedule.py:1` — `ScheduleItemRead`
- `backend/app/api/v1/schedule.py:1` — rotas
- `backend/app/api/v1/router.py:5` — `include_router(schedule.router)`
- `backend/tests/test_schedule.py` — testes (ver abaixo)

## Testes

`backend/tests/test_schedule.py` (padrão `backend/tests/conftest.py:12` `StaticPool` + `sqlite:///:memory:`):
- `test_schedule_geral_ordena_e_exclui_sem_data`
- `test_schedule_por_cadeira_filtra`
- `test_schedule_janela_from_to_inclusive`
- `test_schedule_exclui_arquivado_e_lixeira`
- `test_homepage_hoje_ate_7d_inclusive`
- `test_homepage_exclui_8d_e_ontem`
- `test_schedule_item_filho_com_data_aparece`

## Dependências / próximos passos

- Depende de `Item` + `ItemType` + `Course`/`Period` existentes (`alembic` `aa9833089bb2`).
- Próximo depois deste: **Auth single-user** (`specs/06-requisitos-nao-funcionais.md:14`, `docs/architecture.md:31` `argon2+JWT httpOnly+slowapi`) antes de expor IA (`specs/03-casos-de-uso.md:38`).

## Rastreabilidade

`specs/00-constituicao.md:12` → `specs/04-funcionalidades.md:51` (RF-30..32) → `specs/03-casos-de-uso.md:67` (UC-07/UC-08) → `specs/05-modelo-de-dominio.md:52` → esta feature → `backend/app/services/schedule_service.py:30` / `backend/app/api/v1/schedule.py:13`.
