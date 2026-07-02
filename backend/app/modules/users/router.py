import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.users.schemas import UserCreate, UserOut, UserUpdate
from app.modules.users.service import UserService
from app.shared.enums import RoleName
from app.shared.schemas.base import MessageResponse

router = APIRouter(
    prefix=f"{settings.API_V1_PREFIX}/users",
    tags=["users"],
    dependencies=[Depends(require_role(RoleName.ADMIN))],  # entire module is admin-only
)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


def _to_user_out(user) -> UserOut:
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        role_name=user.role.name,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    user = UserService(db).create_user(payload)
    return _to_user_out(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, payload: UserUpdate, db: Session = Depends(get_db)) -> UserOut:
    user = UserService(db).update_user(user_id, payload)
    return _to_user_out(user)


@router.post("/{user_id}/reset-password", response_model=MessageResponse)
def reset_password(user_id: uuid.UUID, payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    UserService(db).reset_password(user_id, payload.new_password)
    return MessageResponse(detail="Password reset successfully.")
