"""Common dependency providers."""
from __future__ import annotations

from .services.connection_manager import ConnectionManager

connection_manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Return the singleton connection manager instance."""
    return connection_manager

