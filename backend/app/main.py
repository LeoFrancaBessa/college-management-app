from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.services.errors import ConflictError, NotFoundError, ValidationError

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


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
