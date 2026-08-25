from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    PROJECT_NAME: str = "College Management App"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database (Postgres in production via docker-compose; can be overridden
    # locally, e.g. with SQLite, for development without Docker)
    DATABASE_URL: str = "sqlite:///./dev.db"

    # Authentication (single user — see docs/architecture.md)
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # AI provider (Google Gemini — see docs/architecture.md)
    GEMINI_API_KEY: str = ""

    # RF-19 — attachments (volume attachments:/app/attachments in docker-compose)
    ATTACHMENTS_DIR: str = "/app/attachments"
    MAX_ATTACHMENT_SIZE: int = 20 * 1024 * 1024  # 20 MB per file

    # Infra dev — CORS (Vite 5173 -> FastAPI 8000). Em produção Caddy serve
    # frontend+backend na mesma origem, então CORS não é usado, mas é
    # inofensivo manter a lista. Valores separados por vírgula via env
    # CORS_ORIGINS (ex.: "http://localhost:5173,https://meudominio.com").
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"


settings = Settings()
