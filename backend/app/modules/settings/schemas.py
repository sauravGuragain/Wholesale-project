from typing import Any

from pydantic import BaseModel


class SettingOut(BaseModel):
    key: str
    value: dict[str, Any]


class SettingUpdate(BaseModel):
    value: dict[str, Any]


class ImageKeyOut(BaseModel):
    key: str
    url: str
