"""WebSocket connection manager placeholder."""


from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = defaultdict[str, set[WebSocket]](set)

    async def connect(self, job_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[job_id].add(websocket)

    def disconnect(self, job_id: str, websocket: WebSocket) -> None:
        self.active_connections[job_id].discard(websocket)
        if not self.active_connections[job_id]:
            self.active_connections.pop(job_id, None)

    async def send_status(self, job_id: str, message: dict[str, Any]) -> None:
        """Send status message to all WebSocket connections for a job."""
        connections = self.active_connections.get(job_id, set()).copy()
        disconnected = []

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Connection is dead, mark for removal
                disconnected.append(connection)

        # Clean up dead connections
        for connection in disconnected:
            self.disconnect(job_id, connection)
