import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User


def _make_engine():
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


# Single authenticated user that satisfies get_current_user for business routes.
# Services don't yet scope data by user (single-user system), so any valid
# User object is enough to pass the auth gate. No DB row is needed — the
# router-level `dependencies=[Depends(get_current_user)]` discards the return
# value, it just needs to not raise 401.
_DUMMY_USER = User(id=1, email="test@example.com", hashed_password="fake-hash-for-tests")


@pytest.fixture()
def client():
    """Authenticated client — all business routes return 200/201 as before.

    Use `unauth_client` when you need to assert 401 on protected routes.
    """
    engine = _make_engine()
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_auth():
        return _DUMMY_USER

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_auth
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def unauth_client():
    """Unauthenticated client — no auth override, hits the real 401 path."""
    engine = _make_engine()
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # ensure no stale auth override leaks between tests
    app.dependency_overrides.pop(get_current_user, None)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
