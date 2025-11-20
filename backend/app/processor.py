"""Streaming Gzip processor placeholder."""
from __future__ import annotations

from typing import AsyncIterator


async def stream_gzip_rows(file_obj) -> AsyncIterator[dict[str, str]]:
    """Placeholder for gzip streaming logic."""
    yield {"sku": "demo", "name": "Sample", "description": "", "is_active": True}
