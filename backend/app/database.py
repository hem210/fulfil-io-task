"""Database configuration helpers for the FastAPI application."""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .core.config import get_settings

settings = get_settings()

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db() -> None:
    """Create database tables on startup."""
    from . import models  # Local import to avoid circular dependency

    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield a new async session for request-scoped usage."""
    async with SessionLocal() as session:
        yield session
