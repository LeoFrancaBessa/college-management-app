from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.limiter import limiter
from app.services.errors import ConflictError, NotFoundError, ValidationError


@asynccontextmanager
async def lifespan(app: FastAPI):
    # APScheduler: RF-39 expira lixeira após 30 dias. Não inicia em testes.
    import sys

    if "pytest" not in sys.modules and settings.ENVIRONMENT != "testing":
        try:
            from app.core.scheduler import start_scheduler

            start_scheduler()
        except Exception:
            import logging

            logging.getLogger(__name__).exception("Falha ao iniciar scheduler")
    yield
    try:
        from app.core.scheduler import stop_scheduler

        stop_scheduler()
    except Exception:
        pass


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
app.state.limiter = limiter  # slowapi reads from app.state

# CORS: permite Vite dev (5173) chamar a API (8000). Em produção Caddy
# serve tudo na mesma origem, então não há efeito colateral.
_allowed = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# slowapi rate limit handler (only active if slowapi installed)
try:
    from slowapi.errors import RateLimitExceeded  # type: ignore
    from slowapi import _rate_limit_exceeded_handler  # type: ignore

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):  # type: ignore
        return _rate_limit_exceeded_handler(request, exc)
except Exception:
    pass


@app.exception_handler(NotFoundError)
async def handle_not_found(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
async def handle_conflict(request: Request, exc: ConflictError):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(ValidationError)
async def handle_validation_error(request: Request, exc: ValidationError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/health")
def health_check():
    return {"status": "ok"}
