"""
Domain exceptions and their mapping to HTTP responses.

Services raise these (never HTTPException directly — that would couple
business logic to the web layer). main.py registers the handlers below.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class for all domain-level errors."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    default_message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "Resource not found."


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    default_message = "Resource already exists or conflicts with current state."


class ValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = "Invalid input."


class AuthenticationError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_message = "Invalid credentials."


class AuthorizationError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    default_message = "You do not have permission to perform this action."


class InsufficientStockError(AppError):
    status_code = status.HTTP_409_CONFLICT
    default_message = "Insufficient stock for one or more items."


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
