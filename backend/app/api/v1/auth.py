"""Auth routes — single-user: register, login, me, logout.

- Login com slowapi rate limit 5/min (docs/architecture.md:34).
- JWT em cookie httpOnly + Bearer opcional.
- Register bloqueado se já existe usuário (single-user).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.deps import COOKIE_NAME, get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.auth import AuthLogin, AuthRegister, AuthUserRead, MessageResponse, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_KWARGS = dict(
    httponly=True,
    secure=False,  # True em produção via Caddy/HTTPS; False para dev/local
    samesite="lax",
    path="/",
    max_age=settings.JWT_EXPIRE_MINUTES * 60,
)


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(key=COOKIE_NAME, value=token, **COOKIE_KWARGS)  # type: ignore[arg-type]


@router.post("/register", response_model=AuthUserRead, status_code=status.HTTP_201_CREATED)
def register(data: AuthRegister, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, data.email, data.password)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, response: Response, data: AuthLogin, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, data.email, data.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(sub=str(user.id))
    _set_auth_cookie(response, token)
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=AuthUserRead)
def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response, current_user=Depends(get_current_user)):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return MessageResponse(detail="Logged out")


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(response: Response):
    # idempotente: limpa cookie mesmo sem auth válida
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return MessageResponse(detail="Logged out")
