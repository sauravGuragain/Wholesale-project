"""
Auth service: owns login, refresh-token rotation, and logout.

No customer self-signup exists anywhere in this module or in customers/ —
accounts are provisioned exclusively by an admin via the customers module,
per the product requirement that this is not a public-facing storefront.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.modules.users.models import RefreshToken, User
from app.modules.users.repository import RefreshTokenRepository, UserRepository


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)

    def login(self, *, username: str, password: str) -> tuple[User, str, str]:
        """Returns (user, access_token, raw_refresh_token)."""
        user = self.users.get_by_username(username)
        if user is None or not user.is_active or not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid username or password.")

        access_token = create_access_token(subject=str(user.id), role=user.role.name)

        raw_refresh, token_hash, expires_at = generate_refresh_token()
        self.refresh_tokens.create(
            RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        )

        user.last_login_at = datetime.now(timezone.utc)
        self.db.commit()

        return user, access_token, raw_refresh

    def refresh(self, *, raw_refresh_token: str) -> tuple[str, str, str]:
        """Validates + rotates the refresh token. Returns (new_access_token, new_raw_refresh_token, role)."""
        token_hash = hash_refresh_token(raw_refresh_token)
        existing = self.refresh_tokens.get_by_hash(token_hash)

        if existing is None or not existing.is_valid:
            raise AuthenticationError("Refresh token invalid or expired. Please log in again.")

        self.refresh_tokens.revoke(existing)  # rotation: old token is single-use

        user = existing.user
        if not user.is_active:
            self.db.commit()
            raise AuthenticationError("Account is disabled.")

        access_token = create_access_token(subject=str(user.id), role=user.role.name)
        new_raw_refresh, new_hash, new_expires_at = generate_refresh_token()
        self.refresh_tokens.create(
            RefreshToken(user_id=user.id, token_hash=new_hash, expires_at=new_expires_at)
        )

        self.db.commit()
        return access_token, new_raw_refresh, user.role.name

    def logout(self, *, raw_refresh_token: str) -> None:
        token_hash = hash_refresh_token(raw_refresh_token)
        existing = self.refresh_tokens.get_by_hash(token_hash)
        if existing is not None and existing.revoked_at is None:
            self.refresh_tokens.revoke(existing)
            self.db.commit()
