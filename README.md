# College Management App

Gerenciador pessoal de tarefas, cronogramas, provas, projetos e trabalhos da graduação —
backend em Python (FastAPI) e frontend em React. Veja o produto detalhado em [`specs/`](./specs)
e as decisões técnicas em [`docs/architecture.md`](./docs/architecture.md).

## Estrutura

```
college-management-app/
├── backend/                 # API em FastAPI
│   ├── app/
│   │   ├── api/             # Rotas / endpoints
│   │   ├── core/            # Configurações, segurança
│   │   ├── db/               # Engine/sessão do SQLAlchemy
│   │   ├── models/           # Modelos de dados (ORM)
│   │   ├── schemas/          # Schemas Pydantic
│   │   ├── services/         # Regras de negócio
│   │   └── main.py           # Ponto de entrada da aplicação
│   ├── alembic/               # Migrações do banco
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # React + Vite
│   └── Dockerfile
├── specs/                     # Specs de produto (spec-driven development)
├── docs/
│   └── architecture.md       # Decisões técnicas
├── docker-compose.yml         # backend + frontend + Postgres + Caddy
├── Caddyfile                  # reverse proxy / HTTPS automático
└── .env.example                # variáveis usadas pelo docker-compose
```

## Rodando com Docker Compose (produção / VPS)

```bash
cp .env.example .env   # preencha POSTGRES_PASSWORD, JWT_SECRET_KEY, GEMINI_API_KEY, DOMAIN
docker compose up -d --build
```

O Caddy expõe as portas 80/443, roteando `/api/*` para o backend e o restante para o build do
frontend. As migrações do banco (`alembic upgrade head`) rodam automaticamente na inicialização
do container do backend.

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head        # aplica as migrações (usa SQLite local por padrão — ver .env.example)
uvicorn app.main:app --reload
```

Para criar uma nova migração depois de alterar os modelos:

```bash
alembic revision --autogenerate -m "descrição da mudança"
alembic upgrade head
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> Requer Node **22.13+** ou **20.19+** (algumas dependências de dev, como o ESLint mais recente,
> exigem essas versões mínimas).
