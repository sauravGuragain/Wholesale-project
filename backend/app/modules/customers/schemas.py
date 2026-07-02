import uuid
from decimal import Decimal

from pydantic import BaseModel, Field

from app.shared.schemas.base import ORMBaseSchema


class CustomerCreate(BaseModel):
    # Admin provisions the login credentials together with the business profile.
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    business_name: str = Field(min_length=1, max_length=200)
    contact_person: str | None = None
    phone: str | None = None
    address: str | None = None
    price_group_id: uuid.UUID | None = None
    credit_limit: Decimal = Decimal("0")


class CustomerUpdate(BaseModel):
    business_name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    address: str | None = None
    price_group_id: uuid.UUID | None = None
    credit_limit: Decimal | None = None
    is_active: bool | None = None


class CustomerOut(ORMBaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    business_name: str
    contact_person: str | None
    phone: str | None
    address: str | None
    price_group_id: uuid.UUID | None
    credit_limit: Decimal
    outstanding_balance: Decimal
    is_active: bool
