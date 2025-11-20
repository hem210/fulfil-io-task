"""Application configuration settings."""
from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/postgres"
    websocket_base_url: str = "ws://localhost:8000/ws"

    class Config:
        env_file = ".env"
        env_prefix = ""


def get_settings() -> Settings:
    return Settings()
