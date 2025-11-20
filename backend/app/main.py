"""FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI

from .api.routes import router as api_router
from .database import init_db

app = FastAPI(title="Product Management System")


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


app.include_router(api_router)
