"""FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as api_router
from .api.webhook_routes import router as webhook_router, simulation_router
from .core.config import get_settings
from .database import init_db
from .dependencies import connection_manager

app = FastAPI(title="Product Management System")

# Configure CORS
settings = get_settings()
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.frontend_url:
    allowed_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
app.include_router(webhook_router)
app.include_router(simulation_router)
