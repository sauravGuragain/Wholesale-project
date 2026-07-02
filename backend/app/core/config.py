"""
Centralized application configuration.

All environment-dependent values are declared here and nowhere else.
Import `settings` — never read os.environ directly elsewhere in the app.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    APP_NAME: str = "FMCG Ordering Management System"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # --- Security / JWT ---
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_ENV"  # noqa: S105 — dev default only, must be overridden via .env
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Database ---
    DATABASE_URL: str = "postgresql+psycopg://fmcg:fmcg@localhost:5432/fmcg_db"

    # --- CORS ---
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # --- Storage abstraction ---
    # Switching STORAGE_BACKEND to "s3" (plus the S3_* vars below) is the ONLY
    # change required to move file storage to object storage. No application
    # code outside app/core/storage/ knows or cares which backend is active.
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    LOCAL_STORAGE_ROOT: str = "uploads"
    LOCAL_STORAGE_BASE_URL: str = "/static/uploads"

    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_ENDPOINT_URL: str | None = None  # for S3-compatible providers (MinIO, R2, etc.)
    S3_PUBLIC_BASE_URL: str | None = None  # CDN/custom domain in front of the bucket, if any

    # --- Rate limiting ---
    RATE_LIMIT_PER_MINUTE: int = 60

    # --- Pagination ---
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()


settings = get_settings()
