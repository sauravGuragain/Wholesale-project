"""
Single source of truth for price resolution.

Precedence (highest wins), per the product requirement:
    1. Customer-specific price   (customer_price_overrides)
    2. Price group price         (price_group_prices, via the customer's price_group)
    3. Default product price     (products.selling_price)

Every place that needs "the price this customer pays for this product" — the
catalog listing, the cart, and order checkout — must call resolve_price /
resolve_prices here, so the rule can never drift between screens.
"""
import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.customers.models import Customer
from app.modules.products.models import CustomerPriceOverride, PriceGroupPrice, Product


@dataclass(frozen=True)
class ResolvedPrice:
    product_id: uuid.UUID
    price: Decimal
    source: str  # "customer_override" | "price_group" | "default" — surfaced for admin transparency


def resolve_prices(db: Session, *, customer: Customer, products: list[Product]) -> dict[uuid.UUID, ResolvedPrice]:
    """Batch resolver — one DB round-trip per source, not per product (avoids N+1)."""
    product_ids = [p.id for p in products]
    if not product_ids:
        return {}

    # Layer 1: customer-specific overrides
    overrides = {
        row.product_id: row.price
        for row in db.execute(
            select(CustomerPriceOverride).where(
                CustomerPriceOverride.customer_id == customer.id,
                CustomerPriceOverride.product_id.in_(product_ids),
            )
        ).scalars()
    }

    # Layer 2: price-group prices (only if the customer belongs to a group)
    group_prices: dict[uuid.UUID, Decimal] = {}
    if customer.price_group_id is not None:
        group_prices = {
            row.product_id: row.price
            for row in db.execute(
                select(PriceGroupPrice).where(
                    PriceGroupPrice.price_group_id == customer.price_group_id,
                    PriceGroupPrice.product_id.in_(product_ids),
                )
            ).scalars()
        }

    resolved: dict[uuid.UUID, ResolvedPrice] = {}
    for product in products:
        if product.id in overrides:
            resolved[product.id] = ResolvedPrice(product.id, Decimal(overrides[product.id]), "customer_override")
        elif product.id in group_prices:
            resolved[product.id] = ResolvedPrice(product.id, Decimal(group_prices[product.id]), "price_group")
        else:
            resolved[product.id] = ResolvedPrice(product.id, Decimal(product.selling_price), "default")
    return resolved


def resolve_price(db: Session, *, customer: Customer, product: Product) -> ResolvedPrice:
    return resolve_prices(db, customer=customer, products=[product])[product.id]
