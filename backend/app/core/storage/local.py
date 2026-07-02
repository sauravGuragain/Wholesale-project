"""Local-disk implementation of StorageBackend — used in development and small deployments."""
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.storage.base import StorageBackend, StoredFile


class LocalStorage(StorageBackend):
    def __init__(self, root: str | None = None, base_url: str | None = None) -> None:
        self.root = Path(root or settings.LOCAL_STORAGE_ROOT)
        self.base_url = (base_url or settings.LOCAL_STORAGE_BASE_URL).rstrip("/")

    def save(self, *, file_bytes: bytes, filename: str, content_type: str, folder: str) -> StoredFile:
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        target_dir = self.root / folder
        target_dir.mkdir(parents=True, exist_ok=True)

        target_path = target_dir / unique_name
        target_path.write_bytes(file_bytes)

        key = f"{folder}/{unique_name}"
        return StoredFile(
            key=key,
            url=self.url_for(key),
            content_type=content_type,
            size_bytes=len(file_bytes),
        )

    def delete(self, key: str) -> None:
        path = self.root / key
        path.unlink(missing_ok=True)

    def url_for(self, key: str) -> str:
        return f"{self.base_url}/{key}"
