"""
Products, product images, price groups, and pricing tables.

Pricing precedence (customer-specific > price group > default) is realised by
three sources of truth:
  1. products.selling_price         — the default/base price
  2. price_group_prices             — optional per-group price for a product
  3. customer_price_overrides       — optional per-customer price for a product

The resolution logic lives in one place: products/pricing.py::resolve_price.
"""
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class Product(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    barcode: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    brand_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    unit: Mapped[str] = mapped_column(String(32), nullable=False, default="pcs")  # e.g. kg, pack, box, carton
    cost_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    selling_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)  # percent
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order"
    )


class ProductImage(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)  # backend key, resolved to URL on read
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="images")


class PriceGroup(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "price_groups"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class PriceGroupPrice(UUIDPKMixin, TimestampMixin, Base):
    """Per-price-group override of a product's price. One row per (group, product)."""

    __tablename__ = "price_group_prices"
    __table_args__ = (UniqueConstraint("price_group_id", "product_id", name="uq_price_group_product"),)

    price_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("price_groups.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)


class CustomerPriceOverride(UUIDPKMixin, TimestampMixin, Base):
    """Highest-priority price source: a specific price for a specific customer + product."""

    __tablename__ = "customer_price_overrides"
    __table_args__ = (UniqueConstraint("customer_id", "product_id", name="uq_customer_product_price"),)

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
