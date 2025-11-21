"""Streaming Gzip processing and batch upsert logic."""
from __future__ import annotations

import asyncio
import csv
import gzip
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .models import Product
from .services.connection_manager import ConnectionManager
from .utils.logging import get_logger

LOGGER = get_logger()
BATCH_SIZE = 1_000


async def process_upload_job(
    job_id: str,
    file_path: Path,
    session_factory: async_sessionmaker[AsyncSession],
    connection_manager: ConnectionManager,
) -> None:
    """Ingest the uploaded gzip file and upsert rows in batches."""
    batch: list[dict[str, Any]] = []
    # TODO: Remove this after testing
    await asyncio.sleep(10)
    processed = 0

    try:
        LOGGER.info("Starting upload job %s for file: %s", job_id, file_path)
        await connection_manager.send_status(job_id, {"type": "log", "message": "Job started"})

        # Check if file exists
        if not file_path.exists():
            error_msg = f"Uploaded file not found: {file_path}"
            LOGGER.error("Upload job %s: %s", job_id, error_msg)
            raise FileNotFoundError(error_msg)

        LOGGER.info("Processing file %s for job %s", file_path, job_id)
        async with session_factory() as session:
            try:
                for row in _iter_gzip_rows(file_path):
                    normalized = _normalize_row(row)
                    if not normalized:
                        continue
                    batch.append(normalized)

                    if len(batch) >= BATCH_SIZE:
                        await _upsert_batch(session, batch)
                        processed += len(batch)
                        LOGGER.info("Job %s: Processed batch of %d rows (total: %d)", job_id, len(batch), processed)
                        batch.clear()
                        await connection_manager.send_status(
                            job_id,
                            {
                                "type": "progress",
                                "message": f"Processed {processed} rows",
                                "processed": processed,
                            },
                        )

                if batch:
                    await _upsert_batch(session, batch)
                    processed += len(batch)
                    LOGGER.info("Job %s: Processed final batch of %d rows (total: %d)", job_id, len(batch), processed)
                    batch.clear()
                    await connection_manager.send_status(
                        job_id,
                        {
                            "type": "progress",
                            "message": f"Processed {processed} rows",
                            "processed": processed,
                        },
                    )

            except gzip.BadGzipFile as exc:
                error_msg = "File is not a valid gzip archive or is corrupted"
                LOGGER.error("Upload job %s: %s - %s", job_id, error_msg, exc, exc_info=True)
                await connection_manager.send_status(
                    job_id,
                    {"type": "error", "message": "Invalid file format. The file must be a valid gzip-compressed CSV."},
                )
                return

            except csv.Error as exc:
                error_msg = "CSV file is malformed or cannot be parsed"
                LOGGER.error("Upload job %s: %s - %s", job_id, error_msg, exc, exc_info=True)
                await connection_manager.send_status(
                    job_id,
                    {"type": "error", "message": "CSV file format is invalid or cannot be parsed."},
                )
                return

            except SQLAlchemyError as exc:
                error_msg = "Database error occurred during processing"
                LOGGER.error("Upload job %s: %s - %s", job_id, error_msg, exc, exc_info=True)
                await connection_manager.send_status(
                    job_id,
                    {"type": "error", "message": "Database error occurred during processing."},
                )
                return

            except KeyError as exc:
                error_msg = f"CSV is missing required column: {str(exc)}"
                LOGGER.error("Upload job %s: %s", job_id, error_msg, exc_info=True)
                await connection_manager.send_status(
                    job_id,
                    {"type": "error", "message": "CSV file is missing required columns. Required: 'sku' and 'name'."},
                )
                return

        # Success case
        LOGGER.info("Upload job %s completed successfully. Processed %d rows", job_id, processed)
        await connection_manager.send_status(
            job_id,
            {"type": "complete", "message": "Processing complete", "processed": processed},
        )

    except FileNotFoundError as exc:
        error_msg = f"Uploaded file not found: {str(exc)}"
        LOGGER.error("Upload job %s: %s", job_id, error_msg, exc_info=True)
        await connection_manager.send_status(
            job_id,
            {"type": "error", "message": "Uploaded file could not be found."},
        )
        return

    except Exception as exc:  # pragma: no cover - defensive logging
        error_msg = "Unexpected error during processing"
        LOGGER.exception("Upload job %s failed: %s - %s", job_id, error_msg, exc)
        await connection_manager.send_status(
            job_id,
            {"type": "error", "message": "An unexpected error occurred during processing."},
        )
        return

    # Cleanup temp file
    finally:
        try:
            file_path.unlink(missing_ok=True)
        except AttributeError:
            # Python <3.11 compatibility
            if file_path.exists():
                file_path.unlink()
        except Exception as cleanup_exc:
            LOGGER.warning("Failed to cleanup temp file %s: %s", file_path, cleanup_exc)


def _iter_gzip_rows(file_path: Path) -> Iterable[dict[str, Any]]:
    """Iterate over CSV rows from a gzip file."""
    try:
        LOGGER.debug("Opening gzip file: %s", file_path)
        with gzip.open(file_path, mode="rt", newline="", encoding="utf-8") as gz_file:
            reader = csv.DictReader(gz_file)
            # Validate required columns exist
            if not reader.fieldnames:
                LOGGER.error("CSV file has no header row: %s", file_path)
                raise ValueError("CSV file appears to be empty or has no header row")
            required_cols = {"sku", "name"}
            missing_cols = required_cols - set(reader.fieldnames or [])
            if missing_cols:
                LOGGER.error("CSV missing required columns %s in file: %s", missing_cols, file_path)
                raise KeyError(f"Missing required columns: {', '.join(missing_cols)}")
            LOGGER.debug("CSV header validated. Columns: %s", reader.fieldnames)

            row_count = 0
            for row in reader:
                row_count += 1
                yield row
            LOGGER.info("Read %d rows from CSV file", row_count)
    except gzip.BadGzipFile:
        LOGGER.error("Invalid gzip file: %s", file_path, exc_info=True)
        raise
    except csv.Error as exc:
        LOGGER.error("CSV parsing error in file %s: %s", file_path, exc, exc_info=True)
        raise
    except UnicodeDecodeError as exc:
        LOGGER.error("File encoding error in %s: %s", file_path, exc, exc_info=True)
        raise ValueError(f"File encoding error: {exc}") from exc
    except OSError as exc:
        LOGGER.error("Failed to read file %s: %s", file_path, exc, exc_info=True)
        raise OSError(f"Failed to read file: {exc}") from exc


def _normalize_row(row: dict[str, Any]) -> dict[str, Any] | None:
    sku = (row.get("sku") or "").strip().lower()
    name = (row.get("name") or "").strip()
    if not sku or not name:
        return None

    description = (row.get("description") or None) or None
    if description:
        description = description.strip() or None

    return {
        "sku": sku,
        "name": name,
        "description": description,
        "is_active": _parse_bool(row.get("is_active", True)),
    }


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"false", "0", "no"}:
        return False
    return True


async def _upsert_batch(session: AsyncSession, batch: list[dict[str, Any]]) -> None:
    """Upsert a batch of products into the database."""
    if not batch:
        return

    try:
        LOGGER.debug("Upserting batch of %d products", len(batch))
        stmt = insert(Product).values(batch)
        update_cols = {
            "name": stmt.excluded.name,
            "description": stmt.excluded.description,
            "is_active": stmt.excluded.is_active,
        }
        stmt = stmt.on_conflict_do_update(index_elements=[Product.sku], set_=update_cols)
        await session.execute(stmt)
        await session.commit()
        LOGGER.debug("Successfully upserted batch of %d products", len(batch))
    except SQLAlchemyError as exc:
        await session.rollback()
        LOGGER.error("Database error during batch upsert of %d products: %s", len(batch), exc, exc_info=True)
        raise
