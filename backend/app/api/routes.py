"""API router placeholders for upload and product management endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["products"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Simple health endpoint to verify the service is running."""
    return {"status": "ok"}
