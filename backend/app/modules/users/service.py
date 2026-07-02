from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.security import hash_password
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = UserRepository(db)

    def create_user(self, payload: UserCreate) -> User:
        if self.repo.username_exists(payload.username):
            raise ConflictError(f"Username '{payload.username}' is already taken.")

        role = self.repo.get_role_by_name(payload.role_name)
        if role is None:
            raise ValidationError(f"Unknown role '{payload.role_name}'.")

        user = User(
            username=payload.username,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role_id=role.id,
        )
        self.repo.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user_id, payload: UserUpdate) -> User:
        user = self.repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.")

        if payload.email is not None:
            user.email = payload.email
        if payload.is_active is not None:
            user.is_active = payload.is_active

        self.db.commit()
        self.db.refresh(user)
        return user

    def reset_password(self, user_id, new_password: str) -> None:
        user = self.repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        user.password_hash = hash_password(new_password)
        self.db.commit()
