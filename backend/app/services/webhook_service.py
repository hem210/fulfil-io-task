"""Webhook delivery service."""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..database import SessionLocal
from ..models import Webhook
from ..utils.logging import get_logger

LOGGER = get_logger()
WEBHOOK_TIMEOUT = 10.0  # seconds


async def test_webhook_sync(webhook_url: str) -> dict[str, Any]:
    """
    Synchronously test a webhook URL with a test payload.

    This function makes a DIRECT synchronous HTTP POST request and waits
    for the response. Used for webhook testing from the UI.

    Args:
        webhook_url: The webhook URL to test

    Returns:
        Dictionary with keys: status, response_code, response_body, response_time_ms, error
    """
    test_payload = {
        "event": "test",
        "message": "Webhook test trigger",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    start_time = time.time()

    try:
        async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT) as client:
            response = await client.post(webhook_url, json=test_payload)
            response_time_ms = (time.time() - start_time) * 1000

            # Try to get response body as text
            try:
                response_body = response.text
            except Exception:
                response_body = None

            status = "success" if 200 <= response.status_code < 300 else "failed"

            LOGGER.info(
                "Webhook test completed: %s (status: %d, time: %.2fms)",
                webhook_url,
                response.status_code,
                response_time_ms,
            )

            return {
                "status": status,
                "response_code": response.status_code,
                "response_body": response_body,
                "response_time_ms": round(response_time_ms, 2),
                "error": None if status == "success" else f"HTTP {response.status_code}",
            }

    except httpx.TimeoutException:
        response_time_ms = (time.time() - start_time) * 1000
        error_msg = f"Request timeout after {WEBHOOK_TIMEOUT}s"
        LOGGER.error("Webhook test timeout: %s", webhook_url)
        return {
            "status": "failed",
            "response_code": None,
            "response_body": None,
            "response_time_ms": round(response_time_ms, 2),
            "error": error_msg,
        }

    except httpx.RequestError as exc:
        response_time_ms = (time.time() - start_time) * 1000 if "start_time" in locals() else None
        error_msg = f"Request error: {str(exc)}"
        LOGGER.error("Webhook test error: %s - %s", webhook_url, error_msg, exc_info=True)
        return {
            "status": "failed",
            "response_code": None,
            "response_body": None,
            "response_time_ms": round(response_time_ms, 2) if response_time_ms else None,
            "error": error_msg,
        }

    except Exception as exc:
        response_time_ms = (time.time() - start_time) * 1000 if "start_time" in locals() else None
        error_msg = f"Unexpected error: {str(exc)}"
        LOGGER.error("Unexpected error in webhook test: %s - %s", webhook_url, error_msg, exc_info=True)
        return {
            "status": "failed",
            "response_code": None,
            "response_body": None,
            "response_time_ms": round(response_time_ms, 2) if response_time_ms else None,
            "error": error_msg,
        }


async def send_webhook_real_event(
    webhook_url: str,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    """
    Send a webhook for a real event (fire-and-forget, asynchronous).

    This function is designed to be called from background tasks.
    It does not wait for the response and does not return any result.

    Args:
        webhook_url: The webhook URL
        event_type: The event type
        payload: The event payload to send
    """
    try:
        # Prepare the full payload with event type
        full_payload = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **payload,
        }

        async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT) as client:
            response = await client.post(webhook_url, json=full_payload)

            if 200 <= response.status_code < 300:
                LOGGER.info(
                    "Webhook delivered successfully: %s (event: %s, status: %d)",
                    webhook_url,
                    event_type,
                    response.status_code,
                )
            else:
                LOGGER.warning(
                    "Webhook delivery failed: %s (event: %s, status: %d)",
                    webhook_url,
                    event_type,
                    response.status_code,
                )

    except httpx.TimeoutException:
        LOGGER.error("Webhook delivery timeout: %s (event: %s)", webhook_url, event_type)

    except httpx.RequestError as exc:
        LOGGER.error(
            "Webhook delivery error: %s (event: %s) - %s",
            webhook_url,
            event_type,
            str(exc),
            exc_info=True,
        )

    except Exception as exc:
        LOGGER.error(
            "Unexpected error delivering webhook: %s (event: %s) - %s",
            webhook_url,
            event_type,
            str(exc),
            exc_info=True,
        )


async def send_webhook_background_real_event(
    webhook_id: UUID,
    event_type: str,
    payload: dict[str, Any],
    session_factory: async_sessionmaker[AsyncSession] = SessionLocal,
) -> None:
    """
    Background task function to send a webhook for a real event.

    This function is designed to be called from FastAPI BackgroundTasks.
    It creates its own database session, fetches the webhook, and sends it.

    Args:
        webhook_id: The webhook ID to send
        event_type: The event type
        payload: The event payload
        session_factory: Database session factory
    """
    async with session_factory() as session:
        try:
            result = await session.execute(select(Webhook).where(Webhook.id == webhook_id))
            webhook = result.scalar_one_or_none()

            if not webhook:
                LOGGER.error("Webhook %s not found for event delivery", webhook_id)
                return

            if not webhook.is_enabled:
                LOGGER.info("Webhook %s is disabled, skipping event delivery", webhook_id)
                return

            if event_type not in webhook.event_types:
                LOGGER.info(
                    "Event type %s not in webhook %s event types, skipping",
                    event_type,
                    webhook_id,
                )
                return

            # Send webhook asynchronously (fire-and-forget)
            await send_webhook_real_event(webhook.url, event_type, payload)

        except Exception as exc:
            LOGGER.error(
                "Error in background webhook delivery for %s: %s",
                webhook_id,
                exc,
                exc_info=True,
            )


async def trigger_event(
    event_type: str,
    payload: dict[str, Any],
    background_tasks: Any,  # FastAPI BackgroundTasks
    session: AsyncSession,
) -> None:
    """
    Trigger webhooks for a real event (fire-and-forget, asynchronous).

    This function:
    - Fetches ALL enabled webhooks where event_type matches
    - Schedules background tasks to POST to each webhook URL
    - Returns immediately without waiting for webhook deliveries

    Args:
        event_type: The event type to trigger (e.g., "user.created")
        payload: The event payload dictionary
        background_tasks: FastAPI BackgroundTasks instance
        session: Database session
    """
    try:
        # Fetch all enabled webhooks and filter in Python
        # This is reliable and efficient for typical webhook counts
        query = select(Webhook).where(
            Webhook.is_enabled == True,  # noqa: E712
        )
        result = await session.execute(query)
        all_webhooks = result.scalars().all()
        
        # Filter webhooks that have the event_type in their event_types array
        webhooks = [w for w in all_webhooks if event_type in w.event_types]

        LOGGER.info(
            "Triggering event '%s' for %d webhook(s)",
            event_type,
            len(webhooks),
        )

        # Schedule background tasks for each webhook (fire-and-forget)
        for webhook in webhooks:
            background_tasks.add_task(
                send_webhook_background_real_event,
                webhook.id,
                event_type,
                payload,
                SessionLocal,
            )

    except Exception as exc:
        LOGGER.error(
            "Error triggering event '%s': %s",
            event_type,
            exc,
            exc_info=True,
        )



