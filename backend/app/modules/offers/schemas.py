import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.shared.enums import DiscountType, OfferAppliesTo
from app.shared.schemas.base import ORMBaseSchema


class OfferCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    discount_type: DiscountType
    discount_value: Decimal = Field(gt=0)
    applies_to: OfferAppliesTo
    target_id: uuid.UUID | None = None  # product/category id when applies_to != order
    min_order_value: Decimal | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True


class OfferUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    discount_value: Decimal | None = Field(default=None, gt=0)
    min_order_value: Decimal | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None


class OfferOut(ORMBaseSchema):
    id: uuid.UUID
    name: str
    description: str | None
    discount_type: DiscountType
    discount_value: Decimal
    applies_to: OfferAppliesTo
    target_id: uuid.UUID | None
    min_order_value: Decimal | None
    starts_at: datetime | None
    ends_at: datetime | None
    is_active: bool
