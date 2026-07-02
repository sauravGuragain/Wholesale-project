"""
File-upload validation shared by product images, payment proofs, and settings
(QR/logo). Enforces content-type allowlist and a max size, and returns the raw
bytes so callers can hand them to the storage abstraction.
"""
from fastapi import UploadFile

from app.core.exceptions import ValidationError

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


async def read_validated_image(upload: UploadFile) -> tuple[bytes, str, str]:
    """Returns (file_bytes, filename, content_type). Raises ValidationError on violations."""
    if upload.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(
            f"Unsupported file type '{upload.content_type}'. Allowed: JPEG, PNG, WebP."
        )

    file_bytes = await upload.read()
    if len(file_bytes) == 0:
        raise ValidationError("Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise ValidationError("File exceeds the 5 MB size limit.")

    return file_bytes, upload.filename or "upload", upload.content_type
