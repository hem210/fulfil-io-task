"""Database configuration helpers for the FastAPI application."""
from __future__ import annotations

from collections.abc import AsyncIterator
import ssl, certifi

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .core.config import get_settings

settings = get_settings()

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context}
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
