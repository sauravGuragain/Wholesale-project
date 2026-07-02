import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.shared.enums import OrderStatus, PaymentMethod
from app.shared.schemas.base import ORMBaseSchema


class OrderItemInput(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    items: list[OrderItemInput] = Field(min_length=1)
    payment_method: PaymentMethod
    delivery_address: str | None = None
    notes: str | None = None


class OrderItemOut(ORMBaseSchema):
    product_id: uuid.UUID
    product_name_snapshot: str
    sku_snapshot: str
    unit_price_snapshot: Decimal
    quantity: int
    line_total: Decimal


class OrderOut(ORMBaseSchema):
    id: uuid.UUID
    order_number: str
    status: OrderStatus
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    delivery_address: str | None
    notes: str | None
    created_at: datetime
    items: list[OrderItemOut]


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
