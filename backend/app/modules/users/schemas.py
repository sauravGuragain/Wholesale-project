import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.shared.schemas.base import ORMBaseSchema


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=128)
    role_name: str  # "admin" | "customer" — resolved to role_id in service layer


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    is_active: bool | None = None


class UserOut(ORMBaseSchema):
    id: uuid.UUID
    username: str
    email: str | None
    role_name: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
