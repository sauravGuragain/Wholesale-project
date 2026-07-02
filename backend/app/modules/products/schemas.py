import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.shared.schemas.base import ORMBaseSchema


class ProductImageOut(BaseModel):
    id: uuid.UUID
    url: str
    is_primary: bool
    sort_order: int


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=64)
    barcode: str | None = None
    category_id: uuid.UUID
    brand_id: uuid.UUID | None = None
    unit: str = "pcs"
    cost_price: Decimal = Decimal("0")
    selling_price: Decimal = Field(ge=0)
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    barcode: str | None = None
    category_id: uuid.UUID | None = None
    brand_id: uuid.UUID | None = None
    unit: str | None = None
    cost_price: Decimal | None = None
    selling_price: Decimal | None = Field(default=None, ge=0)
    tax_rate: Decimal | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None


class ProductOut(ORMBaseSchema):
    id: uuid.UUID
    name: str
    sku: str
    barcode: str | None
    category_id: uuid.UUID
    brand_id: uuid.UUID | None
    unit: str
    cost_price: Decimal
    selling_price: Decimal
    tax_rate: Decimal
    is_active: bool
    created_at: datetime
    images: list[ProductImageOut] = []


class ProductCatalogItem(BaseModel):
    """What a customer sees: the resolved price for *them*, plus stock availability."""

    id: uuid.UUID
    name: str
    sku: str
    unit: str
    tax_rate: Decimal
    price: Decimal            # resolved via pricing precedence
    price_source: str
    in_stock: bool
    quantity_available: int
    images: list[ProductImageOut] = []


# --- Pricing management (admin) ---

class PriceGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class PriceGroupOut(ORMBaseSchema):
    id: uuid.UUID
    name: str
    description: str | None


class PriceGroupPriceSet(BaseModel):
    product_id: uuid.UUID
    price: Decimal = Field(ge=0)


class CustomerPriceOverrideSet(BaseModel):
    customer_id: uuid.UUID
    product_id: uuid.UUID
    price: Decimal = Field(ge=0)


class BulkPriceImportResult(BaseModel):
    updated: int
    skipped: int
    errors: list[str]
