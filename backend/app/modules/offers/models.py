"""Offers/discounts."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import DiscountType, OfferAppliesTo
from app.shared.models.base import Base, TimestampMixin, UUIDPKMixin


class Offer(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "offers"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    discount_type: Mapped[DiscountType] = mapped_column(SAEnum(DiscountType, name="discount_type"), nullable=False)
    discount_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    applies_to: Mapped[OfferAppliesTo] = mapped_column(SAEnum(OfferAppliesTo, name="offer_applies_to"), nullable=False)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)  # product/category id
    min_order_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
