"""
Reusable FastAPI dependencies: current-user resolution and role guards.

Usage in a router:

    @router.get("/", dependencies=[Depends(require_role(RoleName.ADMIN))])
    def list_customers(...): ...

or, when the endpoint needs the user object itself:

    def get_my_orders(current_user: User = Depends(get_current_user)): ...
"""
import uuid

import jwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_access_token
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import RoleName


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError("Missing or malformed Authorization header.")

    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationError("Access token expired.") from exc
    except jwt.PyJWTError as exc:
        raise AuthenticationError("Invalid access token.") from exc

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError, TypeError) as exc:
        raise AuthenticationError("Malformed access token.") from exc

    user = UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("User not found or inactive.")

    return user


def require_role(*allowed_roles: RoleName):
    """Dependency factory — restricts an endpoint/router to specific roles."""

    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in {r.value for r in allowed_roles}:
            raise AuthorizationError("You do not have permission to perform this action.")
        return current_user

    return _guard
