"""
Settings service.

Settings are a flat key/value (JSONB) store. Well-known keys:
  business_info   -> {name, address, phone, email, ...}
  tax             -> {default_rate, tax_inclusive: bool}
  invoice         -> {prefix, next_number}
  payment_qr      -> {storage_key}   (the static QR image customers scan)
  company_logo    -> {storage_key}
Image-valued settings (QR, logo) go through the storage abstraction, so they
also migrate to S3 with no code change.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.modules.settings.models import Setting

QR_KEY = "payment_qr"
LOGO_KEY = "company_logo"


class SettingsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all(self) -> list[Setting]:
        return list(self.db.execute(select(Setting).order_by(Setting.key)).scalars())

    def get(self, key: str) -> Setting | None:
        return self.db.execute(select(Setting).where(Setting.key == key)).scalar_one_or_none()

    def upsert(self, key: str, value: dict) -> Setting:
        setting = self.get(key)
        if setting is None:
            setting = Setting(key=key, value=value)
            self.db.add(setting)
        else:
            setting.value = value
        self.db.commit()
        self.db.refresh(setting)
        return setting

    def _set_image(self, key: str, *, file_bytes: bytes, filename: str, content_type: str) -> tuple[str, str]:
        # Remove the previous image if one exists, then store the new one.
        existing = self.get(key)
        storage = get_storage()
        if existing and existing.value.get("storage_key"):
            storage.delete(existing.value["storage_key"])

        stored = storage.save(file_bytes=file_bytes, filename=filename, content_type=content_type, folder="settings")
        self.upsert(key, {"storage_key": stored.key})
        return stored.key, stored.url

    def set_payment_qr(self, **kwargs) -> tuple[str, str]:
        return self._set_image(QR_KEY, **kwargs)

    def set_logo(self, **kwargs) -> tuple[str, str]:
        return self._set_image(LOGO_KEY, **kwargs)

    def get_image_url(self, key: str) -> str | None:
        setting = self.get(key)
        if setting is None or not setting.value.get("storage_key"):
            return None
        return get_storage().url_for(setting.value["storage_key"])
