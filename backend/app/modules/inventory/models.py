"""Inventory: current stock per product plus an append-only adjustment log."""
import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models.base import Base, TimestampMixin, UUIDPKMixin


class Inventory(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "inventory"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    quantity_on_hand: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reorder_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=10)


class StockAdjustment(UUIDPKMixin, TimestampMixin, Base):
    """Every change to quantity_on_hand — manual or order-driven — is logged here."""

    __tablename__ = "stock_adjustments"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)  # +restock, -sale/shrinkage
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
