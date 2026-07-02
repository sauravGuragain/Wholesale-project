"""
Inventory service.

decrement_for_order uses SELECT ... FOR UPDATE to lock each product's inventory
row for the duration of the transaction, so two concurrent checkouts can't both
read the same quantity_on_hand and oversell. Every change writes a StockAdjustment
row for auditability.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import InsufficientStockError, NotFoundError
from app.modules.inventory.models import Inventory, StockAdjustment


class InventoryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create(self, product_id: uuid.UUID) -> Inventory:
        inv = self.db.execute(select(Inventory).where(Inventory.product_id == product_id)).scalar_one_or_none()
        if inv is None:
            inv = Inventory(product_id=product_id, quantity_on_hand=0)
            self.db.add(inv)
            self.db.flush()
        return inv

    def adjust(self, *, product_id: uuid.UUID, delta: int, reason: str, user_id: uuid.UUID | None = None) -> Inventory:
        inv = self.get_or_create(product_id)
        new_qty = inv.quantity_on_hand + delta
        if new_qty < 0:
            raise InsufficientStockError("Adjustment would drive stock negative.")
        inv.quantity_on_hand = new_qty
        self.db.add(StockAdjustment(product_id=product_id, delta=delta, reason=reason, user_id=user_id))
        self.db.flush()
        return inv

    def decrement_for_order(self, *, items: dict[uuid.UUID, int], user_id: uuid.UUID | None = None) -> None:
        """items: {product_id: quantity}. Locks rows, validates availability, then decrements atomically."""
        for product_id, qty in items.items():
            # FOR UPDATE lock is a no-op on SQLite (tests) but real on Postgres.
            stmt = select(Inventory).where(Inventory.product_id == product_id).with_for_update()
            inv = self.db.execute(stmt).scalar_one_or_none()
            if inv is None:
                raise NotFoundError(f"No inventory record for product {product_id}.")
            if inv.quantity_on_hand < qty:
                raise InsufficientStockError(
                    f"Only {inv.quantity_on_hand} in stock for product {product_id}, {qty} requested."
                )
            inv.quantity_on_hand -= qty
            self.db.add(
                StockAdjustment(product_id=product_id, delta=-qty, reason="order_confirmed", user_id=user_id)
            )
        self.db.flush()

    def low_stock(self) -> list[Inventory]:
        stmt = select(Inventory).where(Inventory.quantity_on_hand <= Inventory.reorder_threshold)
        return list(self.db.execute(stmt).scalars())

    def low_stock_detailed(self) -> list[dict]:
        """Low-stock rows joined with product name/sku for admin display."""
        from app.modules.products.models import Product

        stmt = (
            select(Inventory, Product)
            .join(Product, Product.id == Inventory.product_id)
            .where(
                Inventory.quantity_on_hand <= Inventory.reorder_threshold,
                Product.deleted_at.is_(None),
            )
            .order_by(Inventory.quantity_on_hand)
        )
        rows = []
        for inv, product in self.db.execute(stmt).all():
            rows.append(
                {
                    "product_id": inv.product_id,
                    "product_name": product.name,
                    "sku": product.sku,
                    "quantity_on_hand": inv.quantity_on_hand,
                    "reorder_threshold": inv.reorder_threshold,
                }
            )
        return rows

    def set_threshold(self, *, product_id: uuid.UUID, reorder_threshold: int) -> Inventory:
        inv = self.get_or_create(product_id)
        inv.reorder_threshold = reorder_threshold
        self.db.flush()
        return inv

    def get(self, product_id: uuid.UUID) -> Inventory:
        inv = self.db.execute(select(Inventory).where(Inventory.product_id == product_id)).scalar_one_or_none()
        if inv is None:
            raise NotFoundError("No inventory record for that product.")
        return inv
