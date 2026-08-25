"""Auth service — single-user (specs/06-requisitos-nao-funcionais.md:14, docs/architecture.md:31).

- Senha com argon2, JWT com expiração longa (30d).
- Registro é opcional: se já existe usuário, bloqueia (single-user).
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.services.errors import ConflictError, ValidationError


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def register_user(db: Session, email: str, password: str) -> User:
    email = email.strip().lower()
    if len(password) < 8:
        raise ValidationError("password must be at least 8 characters")
    # single-user: only one account allowed
    if db.query(User).first() is not None:
        raise ConflictError("single-user system already has an account")
    if get_user_by_email(db, email) is not None:
        raise ConflictError(f"email {email} already registered")
    user = User(email=email, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
