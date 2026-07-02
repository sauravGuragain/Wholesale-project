"""
Auth endpoints.

Refresh tokens travel as an httpOnly, Secure, SameSite=Lax cookie —
never in the JSON body or localStorage — so they're inaccessible to XSS.
Access tokens go in the JSON body; the frontend keeps them in memory only.
"""
from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AuthenticationError
from app.modules.auth.schemas import LoginRequest, TokenResponse
from app.modules.auth.service import AuthService
from app.shared.schemas.base import MessageResponse

router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
_COOKIE_KWARGS = dict(
    httponly=True,
    secure=settings.ENVIRONMENT == "production",
    samesite="lax",
    path=f"{settings.API_V1_PREFIX}/auth",
)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    user, access_token, raw_refresh = AuthService(db).login(username=payload.username, password=payload.password)
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        raw_refresh,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        **_COOKIE_KWARGS,
    )
    return TokenResponse(access_token=access_token, role=user.role.name)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> TokenResponse:
    if refresh_token is None:
        raise AuthenticationError("Missing refresh token.")

    access_token, new_raw_refresh, role = AuthService(db).refresh(raw_refresh_token=refresh_token)
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        new_raw_refresh,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        **_COOKIE_KWARGS,
    )
    return TokenResponse(access_token=access_token, role=role)


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> MessageResponse:
    if refresh_token:
        AuthService(db).logout(raw_refresh_token=refresh_token)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=_COOKIE_KWARGS["path"])
    return MessageResponse(detail="Logged out.")
