from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "College Management App"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Banco de dados (Postgres em produção via docker-compose; pode ser sobrescrito
    # localmente, ex. com SQLite, para desenvolvimento sem Docker)
    DATABASE_URL: str = "sqlite:///./dev.db"

    # Autenticação (usuário único — ver docs/architecture.md)
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 dias

    # Provedor de IA (Google Gemini — ver docs/architecture.md)
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
