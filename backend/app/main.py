"""FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from .api.routes import router as api_router
from .database import init_db
from .dependencies import connection_manager

app = FastAPI(title="Product Management System")


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str) -> None:
    await connection_manager.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(job_id, websocket)


app.include_router(api_router)
