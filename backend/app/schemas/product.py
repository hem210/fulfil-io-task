"""Pydantic schemas for product resources."""
from __future__ import annotations

from pydantic import BaseModel


class ProductBase(BaseModel):
    sku: str
    name: str
    description: str | None = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductRead(ProductBase):
    pass
