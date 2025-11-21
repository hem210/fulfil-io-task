"""Pydantic schemas for webhook resources."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class WebhookBase(BaseModel):
    url: str = Field(..., max_length=2048, description="Webhook URL")
    event_types: list[str] = Field(..., min_length=1, description="List of event types")
    is_enabled: bool = Field(default=True, description="Whether webhook is enabled")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format."""
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("event_types")
    @classmethod
    def validate_event_types(cls, v: list[str]) -> list[str]:
        """Validate event types against allowed list."""
        allowed_events = {
            "user.created",
            "user.modified",
            "payment.completed",
        }
        if not v:
            raise ValueError("At least one event type is required")
        invalid = set(v) - allowed_events
        if invalid:
            raise ValueError(f"Invalid event types: {', '.join(invalid)}")
        return v


class WebhookCreate(WebhookBase):
    """Schema for creating a webhook."""

    pass


class WebhookUpdate(BaseModel):
    """Schema for updating a webhook (all fields optional)."""

    url: str | None = Field(None, max_length=2048, description="Webhook URL")
    event_types: list[str] | None = Field(None, min_length=1, description="List of event types")
    is_enabled: bool | None = Field(None, description="Whether webhook is enabled")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        """Validate URL format."""
        if v is None:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("event_types")
    @classmethod
    def validate_event_types(cls, v: list[str] | None) -> list[str] | None:
        """Validate event types against allowed list."""
        if v is None:
            return v
        allowed_events = {
            "user.created",
            "user.modified",
            "payment.completed",
        }
        if not v:
            raise ValueError("At least one event type is required")
        invalid = set(v) - allowed_events
        if invalid:
            raise ValueError(f"Invalid event types: {', '.join(invalid)}")
        return v


class WebhookRead(WebhookBase):
    """Schema for reading a webhook."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WebhookTestRequest(BaseModel):
    """Schema for testing a webhook."""

    event_type: str = Field(..., description="Event type to test")

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        """Validate event type against allowed list."""
        allowed_events = {
            "user.created",
            "user.modified",
            "payment.completed",
        }
        if v not in allowed_events:
            raise ValueError(f"Invalid event type. Allowed: {', '.join(allowed_events)}")
        return v


class WebhookTestResponse(BaseModel):
    """Schema for webhook test response."""

    status_code: int | None = Field(None, description="HTTP status code")
    response_time_ms: float | None = Field(None, description="Response time in milliseconds")
    success: bool = Field(..., description="Whether the webhook call succeeded")
    error_message: str | None = Field(None, description="Error message if failed")

