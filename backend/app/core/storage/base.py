"""
Storage abstraction layer.

Nothing outside app/core/storage/ should ever know whether files live on
local disk or in S3. Modules (products, settings, payments) depend only on
this interface via `get_storage()`, so migrating STORAGE_BACKEND from
"local" to "s3" in config is a one-line change with zero call-site edits.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class StoredFile:
    """What every storage backend returns after a successful save."""

    key: str          # backend-internal path/key, stored in the DB (e.g. product_images.url)
    url: str           # public/servable URL the frontend can use directly
    content_type: str
    size_bytes: int


class StorageBackend(ABC):
    """Contract implemented by LocalStorage and S3Storage."""

    @abstractmethod
    def save(self, *, file_bytes: bytes, filename: str, content_type: str, folder: str) -> StoredFile:
        """Persist a file under a logical folder (e.g. 'products', 'payment_proofs') and return its metadata."""
        raise NotImplementedError

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove a previously stored file by its key. Must be idempotent (no error if already gone)."""
        raise NotImplementedError

    @abstractmethod
    def url_for(self, key: str) -> str:
        """Resolve a stored key back into a servable URL (used when re-hydrating DB rows)."""
        raise NotImplementedError
