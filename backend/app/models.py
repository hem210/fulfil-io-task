"""SQLAlchemy models for the Product Management system."""
from __future__ import annotations

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for declarative models."""


class Product(Base):
    """Product entity persisted in Supabase/PostgreSQL."""

    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
