"""
Rate limiting middleware.

A lightweight in-process sliding-window limiter keyed by client IP, sufficient
for a single-instance deployment. For multi-replica production behind a load
balancer this should be swapped for a shared store (Redis) — the middleware
boundary here makes that a drop-in replacement without touching route code.
"""
import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

# Auth endpoints get a tighter limit to blunt credential-stuffing.
_AUTH_PATH_PREFIX = f"{settings.API_V1_PREFIX}/auth"
_AUTH_LIMIT_PER_MINUTE = 10
_WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app) -> None:
        super().__init__(app)
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _limit_for(self, path: str) -> int:
        if path.startswith(_AUTH_PATH_PREFIX):
            return _AUTH_LIMIT_PER_MINUTE
        return settings.RATE_LIMIT_PER_MINUTE

    async def dispatch(self, request: Request, call_next):
        # Health check and docs are never limited.
        if request.url.path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        bucket_key = f"{client_ip}:{request.url.path.startswith(_AUTH_PATH_PREFIX)}"
        limit = self._limit_for(request.url.path)

        now = time.monotonic()
        window = self._hits[bucket_key]
        while window and window[0] <= now - _WINDOW_SECONDS:
            window.popleft()

        if len(window) >= limit:
            retry_after = int(_WINDOW_SECONDS - (now - window[0])) + 1
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(retry_after)},
            )

        window.append(now)
        return await call_next(request)
