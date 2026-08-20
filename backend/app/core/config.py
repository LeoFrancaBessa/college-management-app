from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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

    class Config:
        env_file = ".env"


settings = Settings()
