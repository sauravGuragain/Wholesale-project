"""
Test fixtures.

Spins up a fresh in-memory SQLite database per test with all tables created,
overrides the app's get_db dependency to use it, and seeds the two roles the
system depends on (admin, customer). SQLite is fine here because none of the
business logic under test uses Postgres-only features except FOR UPDATE, which
SQLite treats as a harmless no-op.
"""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.modules.users.models import Role
from app.shared.enums import RoleName
from app.shared.models.registry import Base


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # one shared in-memory DB across connections
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = TestingSession()

    # Seed roles.
    session.add_all([Role(name=RoleName.ADMIN.value), Role(name=RoleName.CUSTOMER.value)])
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
