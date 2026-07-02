"""
S3 (or S3-compatible: MinIO, Cloudflare R2, etc.) implementation of StorageBackend.

Not wired up as the active backend today (STORAGE_BACKEND=local by default) but
implements the exact same contract as LocalStorage, so switching backends later
requires only setting STORAGE_BACKEND=s3 and the S3_* env vars — no call-site
changes anywhere in products/, payments/, or settings/ modules.
"""
import mimetypes
import uuid
from pathlib import Path

import boto3
from botocore.client import Config as BotoConfig

from app.core.config import settings
from app.core.storage.base import StorageBackend, StoredFile


class S3Storage(StorageBackend):
    def __init__(self) -> None:
        self.bucket = settings.S3_BUCKET_NAME
        self.public_base_url = settings.S3_PUBLIC_BASE_URL
        self._client = boto3.client(
            "s3",
            region_name=settings.S3_REGION,
            endpoint_url=settings.S3_ENDPOINT_URL,  # None => real AWS S3
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            config=BotoConfig(signature_version="s3v4"),
        )

    def save(self, *, file_bytes: bytes, filename: str, content_type: str, folder: str) -> StoredFile:
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        key = f"{folder}/{unique_name}"

        self._client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
        )

        return StoredFile(key=key, url=self.url_for(key), content_type=content_type, size_bytes=len(file_bytes))

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self.bucket, Key=key)

    def url_for(self, key: str) -> str:
        if self.public_base_url:
            return f"{self.public_base_url.rstrip('/')}/{key}"
        # Fallback: virtual-hosted-style URL (bucket must allow public read, or front with a CDN/signed URLs)
        region_part = f".s3.{settings.S3_REGION}.amazonaws.com" if not settings.S3_ENDPOINT_URL else ""
        return f"https://{self.bucket}{region_part}/{key}"
