import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings, validate_production_settings
from backend.core.logging_config import configure_logging
from backend.DB.session import dispose_engine, get_db_session
from backend.routes.v1.router import router as api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
    configure_logging()
    try:
        settings = get_settings()
    except ValidationError:
        raise RuntimeError(
            "Invalid application configuration; check required settings"
        ) from None
    try:
        validate_production_settings(settings)
    except ValueError as error:
        raise RuntimeError(str(error)) from None

    logger.info(
        "Application startup complete",
        extra={"event_type": "application_started"},
    )
    try:
        yield
    finally:
        await dispose_engine()
        logger.info(
            "Application shutdown complete",
            extra={"event_type": "application_stopped"},
        )


app = FastAPI(
    title="Relay API",
    description="Relay backend API",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(api_router)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
async def readiness_check(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    try:
        await session.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError, TimeoutError) as error:
        logger.warning(
            "Database readiness check failed",
            extra={
                "event_type": "database_readiness_failed",
                "error_type": type(error).__name__,
            },
        )
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready"},
        )
    return JSONResponse(content={"status": "ready"})


@app.exception_handler(RequestValidationError)
async def sanitize_validation_error(
    _: Request,
    error: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "type": item["type"],
            "loc": item["loc"],
            "msg": item["msg"],
        }
        for item in error.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": details})
