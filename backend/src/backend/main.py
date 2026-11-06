from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.DB.session import dispose_engine
from backend.routes.v1.router import router as api_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    try:
        yield
    finally:
        await dispose_engine()


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
