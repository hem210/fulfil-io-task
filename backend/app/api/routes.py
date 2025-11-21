"""API router for upload and product management endpoints."""
from __future__ import annotations

import tempfile
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import SessionLocal, get_session
from ..dependencies import get_connection_manager
from ..models import Product
from ..processor import process_upload_job
from ..schemas.product import ProductCreate, ProductRead
from ..services.connection_manager import ConnectionManager
from ..utils.logging import get_logger

router = APIRouter(prefix="/api", tags=["products"])
LOGGER = get_logger()

ALLOWED_CONTENT_TYPES = {
    "application/gzip",
    "application/x-gzip",
    "application/octet-stream",
}


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Simple health endpoint to verify the service is running."""
    return {"status": "ok"}


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_products(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    connection_manager: ConnectionManager = Depends(get_connection_manager),
) -> dict[str, str]:
    """Accept a gzip-compressed CSV and begin background processing."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        LOGGER.warning(
            "Upload rejected: invalid content type '%s' for file '%s'",
            file.content_type,
            file.filename,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload must be gzip-compressed CSV. Supported content types: application/gzip, application/x-gzip, application/octet-stream",
        )

    if not file.filename:
        LOGGER.warning("Upload rejected: missing filename")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    job_id = uuid.uuid4().hex
    LOGGER.info("Starting upload job %s for file: %s", job_id, file.filename)

    try:
        temp_path = await _persist_upload(file)
        LOGGER.info("File saved to temporary location: %s", temp_path)
    except OSError as exc:
        LOGGER.error(
            "Failed to save uploaded file '%s' for job %s: %s",
            file.filename,
            job_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file",
        ) from exc
    except Exception as exc:
        LOGGER.error(
            "Unexpected error during file upload for job %s (file: %s): %s",
            job_id,
            file.filename,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error during file upload",
        ) from exc

    background_tasks.add_task(
        process_upload_job,
        job_id,
        temp_path,
        SessionLocal,
        connection_manager,
    )
    LOGGER.info("Background processing task scheduled for job %s", job_id)

    return {"job_id": job_id}


@router.get("/products", response_model=list[ProductRead])
async def list_products(
    offset: int = 0,
    limit: int = 50,
    search: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[ProductRead]:
    """Return paginated products with optional case-insensitive search."""
    try:
        query = select(Product).order_by(Product.sku).offset(offset).limit(limit)

        if search:
            pattern = f"%{search.lower()}%"
            query = query.where(
                func.lower(Product.sku).like(pattern) | func.lower(Product.name).like(pattern)
            )
            LOGGER.info("Fetching products with search='%s', offset=%d, limit=%d", search, offset, limit)
        else:
            LOGGER.info("Fetching products with offset=%d, limit=%d", offset, limit)

        result = await session.execute(query)
        records = result.scalars().all()
        LOGGER.info("Retrieved %d products", len(records))
        return [ProductRead.model_validate(record) for record in records]
    except Exception as exc:
        LOGGER.error("Error fetching products: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve products",
        ) from exc


@router.post("/products", status_code=status.HTTP_201_CREATED, response_model=ProductRead)
async def create_product(
    product_data: ProductCreate,
    session: AsyncSession = Depends(get_session),
) -> ProductRead:
    """Create or update a single product."""
    try:
        # Normalize SKU: lowercase and strip whitespace
        normalized_sku = product_data.sku.strip().lower()
        if not normalized_sku:
            LOGGER.warning("Attempted to create product with empty SKU")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU cannot be empty",
            )

        if not product_data.name.strip():
            LOGGER.warning("Attempted to create product with empty name (SKU: %s)", normalized_sku)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product name cannot be empty",
            )

        LOGGER.info("Creating/updating product with SKU: %s", normalized_sku)

        # Prepare product data with normalized SKU
        product_dict = {
            "sku": normalized_sku,
            "name": product_data.name.strip(),
            "description": product_data.description.strip() if product_data.description else None,
            "is_active": product_data.is_active,
        }

        # Upsert product (insert or update on conflict)
        stmt = insert(Product).values(product_dict)
        update_cols = {
            "name": stmt.excluded.name,
            "description": stmt.excluded.description,
            "is_active": stmt.excluded.is_active,
        }
        stmt = stmt.on_conflict_do_update(index_elements=[Product.sku], set_=update_cols)
        await session.execute(stmt)
        await session.commit()

        # Fetch the created/updated product
        result = await session.execute(select(Product).where(Product.sku == normalized_sku))
        product = result.scalar_one()

        LOGGER.info("Successfully created/updated product with SKU: %s", normalized_sku)
        return ProductRead.model_validate(product)

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        await session.rollback()
        LOGGER.error("Database error while creating product (SKU: %s): %s", product_data.sku, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product",
        ) from exc
    except Exception as exc:
        LOGGER.error("Unexpected error while creating product (SKU: %s): %s", product_data.sku, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product",
        ) from exc


@router.delete("/products/all", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_products(session: AsyncSession = Depends(get_session)) -> Response:
    """Truncate the products table."""
    try:
        LOGGER.info("Truncating products table")
        await session.execute(text("TRUNCATE TABLE products"))
        await session.commit()
        LOGGER.info("Products table truncated successfully")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        LOGGER.error("Error truncating products table: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete products",
        ) from exc


async def _persist_upload(upload_file: UploadFile) -> Path:
    """Save uploaded file to temporary location."""
    suffix = Path(upload_file.filename or "").suffix or ".gz"
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            bytes_written = 0
            while chunk := await upload_file.read(1024 * 1024):
                temp.write(chunk)
                bytes_written += len(chunk)
            LOGGER.debug("Wrote %d bytes to temporary file: %s", bytes_written, temp.name)
        await upload_file.close()
        return Path(temp.name)
    except Exception as exc:
        LOGGER.error("Error persisting upload file '%s': %s", upload_file.filename, exc, exc_info=True)
        raise
