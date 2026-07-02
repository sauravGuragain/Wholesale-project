"""
Application entrypoint: creates the FastAPI app, wires middleware,
mounts local file storage as static files (dev/local-disk mode only),
and registers module routers + exception handlers.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import AppError, app_error_handler
from app.core.rate_limit import RateLimitMiddleware
from app.shared.models import registry as _model_registry  # noqa: F401  (ensures all mappers configure)
from app.modules.auth.router import router as auth_router
from app.modules.categories.router import brand_router, router as categories_router
from app.modules.customers.router import router as customers_router
from app.modules.inventory.router import router as inventory_router
from app.modules.offers.router import router as offers_router
from app.modules.orders.router import router as orders_router
from app.modules.payments.router import router as payments_router
from app.modules.products.router import router as products_router
from app.modules.reports.router import router as reports_router
from app.modules.settings.router import router as settings_router
from app.modules.users.router import router as users_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,  # required for the httpOnly refresh-token cookie
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware)

    app.add_exception_handler(AppError, app_error_handler)

    # Serving uploads directly only makes sense for the local storage backend;
    # under S3 the storage layer returns bucket/CDN URLs instead.
    if settings.STORAGE_BACKEND == "local":
        app.mount(
            settings.LOCAL_STORAGE_BASE_URL,
            StaticFiles(directory=settings.LOCAL_STORAGE_ROOT),
            name="uploads",
        )

    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(customers_router)
    app.include_router(categories_router)
    app.include_router(brand_router)
    app.include_router(products_router)
    app.include_router(inventory_router)
    app.include_router(orders_router)
    app.include_router(payments_router)
    app.include_router(offers_router)
    app.include_router(reports_router)
    app.include_router(settings_router)

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
