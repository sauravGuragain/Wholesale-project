from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import NotFoundError
from app.modules.settings.schemas import ImageKeyOut, SettingOut, SettingUpdate
from app.modules.settings.service import QR_KEY, SettingsService
from app.shared.enums import RoleName
from app.shared.schemas.base import MessageResponse
from app.shared.utils.file_upload import read_validated_image

router = APIRouter(prefix=f"{app_settings.API_V1_PREFIX}/settings", tags=["settings"])
admin_dep = Depends(require_role(RoleName.ADMIN))


@router.get("", response_model=list[SettingOut], dependencies=[admin_dep])
def list_settings(db: Session = Depends(get_db)) -> list[SettingOut]:
    return [SettingOut(key=s.key, value=s.value) for s in SettingsService(db).get_all()]


@router.get("/{key}", response_model=SettingOut, dependencies=[admin_dep])
def get_setting(key: str, db: Session = Depends(get_db)) -> SettingOut:
    setting = SettingsService(db).get(key)
    if setting is None:
        raise NotFoundError(f"Setting '{key}' not found.")
    return SettingOut(key=setting.key, value=setting.value)


@router.put("/{key}", response_model=SettingOut, dependencies=[admin_dep])
def upsert_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db)) -> SettingOut:
    setting = SettingsService(db).upsert(key, payload.value)
    return SettingOut(key=setting.key, value=setting.value)


@router.put("/images/payment-qr", response_model=ImageKeyOut, dependencies=[admin_dep])
async def upload_payment_qr(file: UploadFile = File(...), db: Session = Depends(get_db)) -> ImageKeyOut:
    file_bytes, filename, content_type = await read_validated_image(file)
    key, url = SettingsService(db).set_payment_qr(file_bytes=file_bytes, filename=filename, content_type=content_type)
    return ImageKeyOut(key=key, url=url)


@router.put("/images/logo", response_model=ImageKeyOut, dependencies=[admin_dep])
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)) -> ImageKeyOut:
    file_bytes, filename, content_type = await read_validated_image(file)
    key, url = SettingsService(db).set_logo(file_bytes=file_bytes, filename=filename, content_type=content_type)
    return ImageKeyOut(key=key, url=url)


@router.get("/images/payment-qr/url")
def get_payment_qr_url(_=Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, str | None]:
    # Any authenticated user (incl. customers at checkout) can fetch the QR to display.
    return {"url": SettingsService(db).get_image_url(QR_KEY)}
