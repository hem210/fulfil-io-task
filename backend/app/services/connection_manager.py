"""WebSocket connection manager placeholder."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, job_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[job_id].add(websocket)

    def disconnect(self, job_id: str, websocket: WebSocket) -> None:
        self.active_connections[job_id].discard(websocket)
        if not self.active_connections[job_id]:
            self.active_connections.pop(job_id, None)

    async def send_status(self, job_id: str, message: dict[str, Any]) -> None:
        for connection in self.active_connections.get(job_id, set()):
            await connection.send_json(message)
