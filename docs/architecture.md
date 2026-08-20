# Arquitetura Técnica

> Este documento registra as decisões técnicas do projeto e o porquê de cada uma. As specs de
> produto (`specs/`) definem *o quê*; este documento define *como*.

## Stack decidida

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | **React + Vite** | Maior ecossistema para kanban/drag-and-drop (`dnd-kit`) e calendário (`FullCalendar`) — encaixa direto nos Boards e no Cronograma. |
| Backend | **FastAPI** (já decidido antes) | Async nativo, tipagem com Pydantic, boa integração com IA (function calling). |
| Banco de dados | **PostgreSQL** | Suporta JSONB (bom para as features plugáveis, que têm formatos de dado variáveis por item) e escala se o projeto crescer. |
| Provedor de IA | **Google Gemini** (Flash) | Free tier generoso, com suporte a *structured output* / function calling — essencial para o UC-04. |
| Hospedagem | **VPS + Docker Compose** | Controle total, custo baixo e previsível (~US$4-6/mês), disco persistente próprio para Postgres e anexos. |

## Backend

- **Linguagem/framework:** Python + FastAPI (já scaffolded em `backend/`).
- **ORM:** SQLAlchemy 2.0 (estilo async) + **Alembic** para migrações. Schemas de entrada/saída
  da API em Pydantic v2, separados dos modelos de banco (evita acoplar schema de API à
  modelagem de dados).
- **Modelagem do `Item`:** uma única tabela `items` (auto-relacionamento `parent_id` para
  aninhamento ilimitado — Regra pétrea 1) + uma coluna JSONB `features` guardando os dados das
  features plugáveis ativadas (Nota, Checklist, Anotações, Recorrência, Board), já que cada
  feature tem um formato diferente e são todas opcionais (Regra pétrea 3). Anexos ficam em
  tabela própria (arquivo é binário, não cabe bem em JSONB).
- **Jobs em background:** **APScheduler**, rodando no próprio processo da aplicação (sem
  Redis/Celery — não há escala que justifique infraestrutura extra). Usos:
  - Expirar itens da lixeira após 30 dias (RF-39).
  - Gerar/atualizar instâncias futuras de itens com Recorrência ativa.
- **Autenticação:** usuário único, credenciais guardadas no banco (usuário + hash da senha com
  **argon2**). Login devolve um JWT guardado em cookie `httpOnly`, `Secure`, `SameSite=Strict`,
  com validade longa (ex.: 30 dias, já que é você mesmo relogando de vez em quando). Rate
  limiting no endpoint de login (`slowapi`) — necessário por estar exposto publicamente.
- **Integração com IA (UC-04):** endpoint dedicado que recebe o texto livre do usuário, chama o
  Gemini com *function calling* declarando as ações possíveis (`criar_item`, `editar_item`,
  `excluir_itens`, cada uma com seus parâmetros estruturados). Se o modelo não retornar nenhuma
  chamada de função com confiança, a API responde "não entendi, pode explicar melhor?" (RF-36) —
  nenhuma ação é executada nesse caso.

## Frontend

- **React + Vite**, TypeScript.
- **Roteamento:** React Router.
- **Estado/dados remotos:** React Query (cache e sincronização com a API).
- **Board (kanban/sprint):** `dnd-kit` para drag-and-drop.
- **Cronograma/calendário:** `FullCalendar` (ou equivalente) para as visões geral/por cadeira e a
  homepage "Hoje / Próximos 7 dias".
- **Estilo:** a definir na hora de implementar (Tailwind é o candidato natural, mas não é uma
  decisão de arquitetura crítica — pode ser revisitada sem custo).

## Banco de dados e persistência

- **PostgreSQL** rodando como container próprio no `docker-compose`, com volume nomeado para
  persistência.
- **Anexos** (arquivos/imagens) guardados em disco, em volume próprio do VPS — mapeado no
  `docker-compose`. Simplicidade > object storage, dado o volume de dados de um único usuário.
- **Backup:**
  - Nível de produto: export/import em JSON (RF-40), acionado pelo próprio usuário.
  - Nível de infraestrutura: rotina agendada (cron no host, ou job do APScheduler) fazendo
    `pg_dump` + arquivo compactado do volume de anexos, com retenção de alguns dias/semanas.

## Segurança / Deploy

- **Reverse proxy: Caddy** — HTTPS automático (Let's Encrypt) com configuração mínima
  (`Caddyfile`), servindo o build estático do frontend e roteando `/api/*` para o backend.
- **Segredos** (senha do usuário — via hash no banco, `GEMINI_API_KEY`, chave de assinatura do
  JWT) ficam em variáveis de ambiente (`.env`, nunca commitado — já coberto pelo `.gitignore`).
- Superfície pública mínima: só as portas 80/443 (Caddy) expostas; Postgres e backend acessíveis
  apenas dentro da rede interna do Docker Compose.

## Estrutura de projeto (atualização)

```
college-management-app/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # rotas (items, cadeiras, periodos, boards, ai, auth, export)
│   │   ├── core/             # config, segurança (JWT/hash), scheduler
│   │   ├── db/                # engine/session do SQLAlchemy
│   │   ├── models/           # modelos SQLAlchemy (Periodo, Cadeira, Item, Tag, Attachment, User)
│   │   ├── schemas/           # Pydantic (request/response)
│   │   ├── services/          # regras de negócio (cronograma, média, IA, lixeira)
│   │   └── main.py
│   ├── alembic/               # migrações (novo)
│   ├── tests/
│   └── requirements.txt
├── frontend/                  # React + Vite (a scaffoldar)
├── specs/                     # specs de produto (spec-driven development)
├── docs/
│   └── architecture.md        # este documento
├── docker-compose.yml          # novo — backend + frontend + postgres + caddy
└── Caddyfile                   # novo
```

## Testes

- **Backend:** `pytest` + `pytest-asyncio`, banco de testes isolado (SQLite em memória ou
  container Postgres efêmero).
- **Frontend:** `Vitest` + `React Testing Library` para componentes críticos (Board, formulário
  de item, chat da IA).

## Decisões em aberto / a revisitar

- Provedor exato do VPS (Hetzner, DigitalOcean, etc.) e domínio — decisão operacional, não
  bloqueia o desenvolvimento.
- Biblioteca de estilo do frontend (Tailwind vs CSS Modules vs outra) — decidir na hora de
  scaffoldar o frontend.
- CI/CD (ex.: GitHub Actions rodando testes e fazendo deploy no VPS via SSH) — desenhar quando o
  repositório for versionado/publicado.
