"""Database configuration helpers for the FastAPI application."""
from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/postgres")

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db() -> None:
    """Create database tables on startup."""
    from . import models  # Local import to avoid circular dependency

    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


def get_session() -> AsyncSession:
    """Return a new async session for request-scoped usage."""
    return SessionLocal()
