"""API router for webhook management endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.events import AVAILABLE_EVENTS
from ..database import get_session
from ..models import Webhook
from ..schemas.webhook import (
    WebhookCreate,
    WebhookRead,
    WebhookUpdate,
)
from typing import Any

from ..services.webhook_service import test_webhook_sync, trigger_event
from ..utils.logging import get_logger

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
LOGGER = get_logger()

# Simulation router for event triggers
simulation_router = APIRouter(prefix="/simulate", tags=["simulation"])


@router.get("/events", response_model=list[str])
async def get_available_events() -> list[str]:
    """Get list of available event types."""
    return sorted(list(AVAILABLE_EVENTS))


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WebhookRead)
async def create_webhook(
    webhook_data: WebhookCreate,
    session: AsyncSession = Depends(get_session),
) -> WebhookRead:
    """Create a new webhook."""
    try:
        webhook = Webhook(
            url=webhook_data.url,
            event_types=webhook_data.event_types,
            is_enabled=webhook_data.is_enabled,
        )
        session.add(webhook)
        await session.commit()
        await session.refresh(webhook)

        LOGGER.info("Created webhook %s for URL: %s", webhook.id, webhook.url)
        return WebhookRead.model_validate(webhook, from_attributes=True)

    except SQLAlchemyError as exc:
        await session.rollback()
        LOGGER.error("Database error while creating webhook: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create webhook",
        ) from exc
    except Exception as exc:
        await session.rollback()
        LOGGER.error("Unexpected error while creating webhook: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create webhook",
        ) from exc


@router.get("", response_model=list[WebhookRead])
async def list_webhooks(
    offset: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[WebhookRead]:
    """List all webhooks with pagination."""
    try:
        query = select(Webhook).order_by(Webhook.created_at.desc()).offset(offset).limit(limit)
        result = await session.execute(query)
        webhooks = result.scalars().all()

        LOGGER.info("Retrieved %d webhooks (offset=%d, limit=%d)", len(webhooks), offset, limit)
        return [WebhookRead.model_validate(webhook, from_attributes=True) for webhook in webhooks]

    except Exception as exc:
        LOGGER.error("Error fetching webhooks: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve webhooks",
        ) from exc


@router.get("/{webhook_id}", response_model=WebhookRead)
async def get_webhook(
    webhook_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> WebhookRead:
    """Get a single webhook by ID."""
    try:
        result = await session.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()

        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Webhook with ID '{webhook_id}' not found",
            )

        return WebhookRead.model_validate(webhook, from_attributes=True)

    except HTTPException:
        raise
    except Exception as exc:
        LOGGER.error("Error fetching webhook %s: %s", webhook_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve webhook",
        ) from exc


@router.put("/{webhook_id}", response_model=WebhookRead)
async def update_webhook(
    webhook_id: uuid.UUID,
    webhook_data: WebhookUpdate,
    session: AsyncSession = Depends(get_session),
) -> WebhookRead:
    """Update an existing webhook."""
    try:
        result = await session.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()

        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Webhook with ID '{webhook_id}' not found",
            )

        # Update fields if provided
        if webhook_data.url is not None:
            webhook.url = webhook_data.url
        if webhook_data.event_types is not None:
            webhook.event_types = webhook_data.event_types
        if webhook_data.is_enabled is not None:
            webhook.is_enabled = webhook_data.is_enabled

        await session.commit()
        await session.refresh(webhook)

        LOGGER.info("Updated webhook %s", webhook_id)
        return WebhookRead.model_validate(webhook, from_attributes=True)

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        await session.rollback()
        LOGGER.error("Database error while updating webhook %s: %s", webhook_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update webhook",
        ) from exc
    except Exception as exc:
        await session.rollback()
        LOGGER.error("Unexpected error while updating webhook %s: %s", webhook_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update webhook",
        ) from exc


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Delete a webhook by ID."""
    try:
        result = await session.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()

        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Webhook with ID '{webhook_id}' not found",
            )

        await session.delete(webhook)
        await session.commit()

        LOGGER.info("Deleted webhook %s", webhook_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        await session.rollback()
        LOGGER.error("Database error while deleting webhook %s: %s", webhook_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete webhook",
        ) from exc
    except Exception as exc:
        await session.rollback()
        LOGGER.error("Unexpected error while deleting webhook %s: %s", webhook_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete webhook",
        ) from exc


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """
    Test a webhook synchronously.

    Makes a DIRECT synchronous HTTP POST request to the webhook URL
    and waits for the response. Returns detailed test results.
    """
    try:
        result = await session.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()

        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Webhook with ID '{webhook_id}' not found",
            )

        LOGGER.info("Testing webhook %s (URL: %s)", webhook_id, webhook.url)

        # Make synchronous test request
        test_result = await test_webhook_sync(webhook.url)

        return test_result

    except HTTPException:
        raise
    except Exception as exc:
        LOGGER.error("Error testing webhook %s: %s", webhook_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to test webhook",
        ) from exc


# ============================================================
# Simulation Endpoints for Real Event Triggering
# ============================================================


@simulation_router.post("/user-created")
async def simulate_user_created(
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Simulate a user.created event.

    Triggers webhooks asynchronously (fire-and-forget) for all
    enabled webhooks subscribed to 'user.created' event.
    """
    payload = {
        "user_id": 123,
        "email": "demo@example.com",
    }

    await trigger_event("user.created", payload, background_tasks, session)

    return {"message": "Event triggered"}


@simulation_router.post("/user-modified")
async def simulate_user_modified(
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Simulate a user.modified event.

    Triggers webhooks asynchronously (fire-and-forget) for all
    enabled webhooks subscribed to 'user.modified' event.
    """
    payload = {
        "user_id": 123,
        "email": "updated@example.com",
        "changes": ["email", "name"],
    }

    await trigger_event("user.modified", payload, background_tasks, session)

    return {"message": "Event triggered"}


@simulation_router.post("/payment-completed")
async def simulate_payment_completed(
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Simulate a payment.completed event.

    Triggers webhooks asynchronously (fire-and-forget) for all
    enabled webhooks subscribed to 'payment.completed' event.
    """
    payload = {
        "payment_id": 777,
        "status": "success",
    }

    await trigger_event("payment.completed", payload, background_tasks, session)

    return {"message": "Event triggered"}

