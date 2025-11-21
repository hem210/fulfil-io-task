"""Event type definitions and payload structures."""
from __future__ import annotations

from typing import Any

# Event type constants
USER_CREATED = "user.created"
USER_MODIFIED = "user.modified"
PAYMENT_COMPLETED = "payment.completed"

# All available event types
AVAILABLE_EVENTS = {
    USER_CREATED,
    USER_MODIFIED,
    PAYMENT_COMPLETED,
}


def get_event_payload(event_type: str) -> dict[str, Any]:
    """
    Generate a dummy payload for the given event type.

    Args:
        event_type: The event type identifier

    Returns:
        Dictionary containing event payload

    Raises:
        ValueError: If event_type is not recognized
    """
    if event_type == USER_CREATED:
        return {
            "event": USER_CREATED,
            "timestamp": "2024-01-15T10:30:00Z",
            "data": {
                "user_id": "user_123",
                "email": "newuser@example.com",
                "name": "John Doe",
                "created_at": "2024-01-15T10:30:00Z",
            },
        }
    elif event_type == USER_MODIFIED:
        return {
            "event": USER_MODIFIED,
            "timestamp": "2024-01-15T11:45:00Z",
            "data": {
                "user_id": "user_123",
                "email": "updateduser@example.com",
                "name": "John Doe Updated",
                "updated_at": "2024-01-15T11:45:00Z",
                "changes": ["email", "name"],
            },
        }
    elif event_type == PAYMENT_COMPLETED:
        return {
            "event": PAYMENT_COMPLETED,
            "timestamp": "2024-01-15T12:00:00Z",
            "data": {
                "payment_id": "pay_456",
                "user_id": "user_123",
                "amount": 99.99,
                "currency": "USD",
                "status": "completed",
                "completed_at": "2024-01-15T12:00:00Z",
            },
        }
    else:
        raise ValueError(f"Unknown event type: {event_type}")

