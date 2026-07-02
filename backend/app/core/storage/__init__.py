"""
Public entry point for the storage abstraction.

Every module that needs to save/delete a file does:

    from app.core.storage import get_storage
    storage = get_storage()
    stored = storage.save(file_bytes=..., filename=..., content_type=..., folder="products")

and never imports LocalStorage or S3Storage directly. That's what makes the
backend swap a config-only change.
"""
from functools import lru_cache

from app.core.config import settings
from app.core.storage.base import StorageBackend, StoredFile

__all__ = ["StorageBackend", "StoredFile", "get_storage"]


@lru_cache
def get_storage() -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        from app.core.storage.s3 import S3Storage

        return S3Storage()

    from app.core.storage.local import LocalStorage

    return LocalStorage()
