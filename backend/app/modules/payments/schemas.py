import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.shared.enums import PaymentMethod, PaymentStatus
from app.shared.schemas.base import ORMBaseSchema


class PaymentProofOut(BaseModel):
    id: uuid.UUID
    url: str
    created_at: datetime


class PaymentOut(ORMBaseSchema):
    id: uuid.UUID
    order_id: uuid.UUID
    method: PaymentMethod
    amount: Decimal
    status: PaymentStatus
    verified_at: datetime | None
    rejection_reason: str | None
    proofs: list[PaymentProofOut] = []


class RejectPaymentInput(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
