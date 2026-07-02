"""
Smoke test — verifies the FastAPI app assembles correctly (imports, routing,
dependency wiring) without needing a live database for the /health check.
Module-specific business-logic tests live under tests/modules/.
"""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_users_endpoint_requires_auth() -> None:
    response = client.post("/api/v1/users", json={"username": "x", "password": "password123", "role_name": "admin"})
    assert response.status_code == 401
