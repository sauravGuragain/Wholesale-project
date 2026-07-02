from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.modules.users.models import RefreshToken, Role, User
from app.shared.repository import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_username(self, username: str, *, include_inactive: bool = True) -> User | None:
        stmt = self._base_query().options(joinedload(User.role)).where(User.username == username)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_role_by_name(self, name: str) -> Role | None:
        return self.db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()

    def username_exists(self, username: str) -> bool:
        return self.get_by_username(username) is not None


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, token: RefreshToken) -> RefreshToken:
        self.db.add(token)
        self.db.flush()
        return token

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        stmt = select(RefreshToken).options(joinedload(RefreshToken.user)).where(
            RefreshToken.token_hash == token_hash
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def revoke(self, token: RefreshToken) -> None:
        from datetime import datetime, timezone

        token.revoked_at = datetime.now(timezone.utc)
        self.db.flush()

    def revoke_all_for_user(self, user_id) -> None:
        from datetime import datetime, timezone

        stmt = select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        for token in self.db.execute(stmt).scalars():
            token.revoked_at = datetime.now(timezone.utc)
        self.db.flush()
