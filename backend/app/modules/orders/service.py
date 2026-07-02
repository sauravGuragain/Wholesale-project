"""
Order service — the core commerce transaction.

place_order does the following as one atomic unit of work (single DB transaction):
  1. Loads the customer and the requested products.
  2. Resolves each line price via the central pricing rule (customer > group > default).
  3. Computes line totals, tax, and grand total using price snapshots.
  4. Locks + decrements inventory (prevents overselling under concurrency).
  5. Creates the order, its items, an initial status-history row, and a Payment row.

If any step fails (e.g. insufficient stock), the whole thing rolls back — no
partial order, no phantom stock decrement.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.customers.models import Customer
from app.modules.inventory.service import InventoryService
from app.modules.orders.models import Order, OrderItem, OrderStatusHistory
from app.modules.orders.schemas import OrderCreate
from app.modules.payments.models import Payment
from app.modules.products.models import Product
from app.modules.products.pricing import resolve_prices
from app.shared.enums import ORDER_STATUS_TRANSITIONS, OrderStatus, PaymentStatus


class OrderService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.inventory = InventoryService(db)

    # ---- creation ----

    def place_order(self, *, customer: Customer, payload: OrderCreate, user_id: uuid.UUID) -> Order:
        # Collapse duplicate product lines into summed quantities.
        requested: dict[uuid.UUID, int] = {}
        for line in payload.items:
            requested[line.product_id] = requested.get(line.product_id, 0) + line.quantity

        products = list(
            self.db.execute(
                select(Product).where(
                    Product.id.in_(requested.keys()),
                    Product.deleted_at.is_(None),
                    Product.is_active.is_(True),
                )
            ).scalars()
        )
        if len(products) != len(requested):
            raise ValidationError("One or more products are unavailable or inactive.")

        prices = resolve_prices(self.db, customer=customer, products=products)

        subtotal = Decimal("0")
        tax_total = Decimal("0")
        order_items: list[OrderItem] = []

        for product in products:
            qty = requested[product.id]
            unit_price = prices[product.id].price
            line_total = (unit_price * qty).quantize(Decimal("0.01"))
            tax_rate = Decimal(product.tax_rate)
            line_tax = (line_total * tax_rate / Decimal("100")).quantize(Decimal("0.01"))

            subtotal += line_total
            tax_total += line_tax

            order_items.append(
                OrderItem(
                    product_id=product.id,
                    product_name_snapshot=product.name,
                    sku_snapshot=product.sku,
                    unit_price_snapshot=unit_price,
                    tax_rate_snapshot=tax_rate,
                    quantity=qty,
                    line_total=line_total,
                )
            )

        grand_total = (subtotal + tax_total).quantize(Decimal("0.01"))

        # Reserve stock (locks rows, raises InsufficientStockError -> rollback if short).
        self.inventory.decrement_for_order(items=requested, user_id=user_id)

        order = Order(
            order_number=self._generate_order_number(),
            customer_id=customer.id,
            status=OrderStatus.PENDING,
            subtotal=subtotal,
            tax_total=tax_total,
            discount_total=Decimal("0"),
            grand_total=grand_total,
            delivery_address=payload.delivery_address or customer.address,
            notes=payload.notes,
            items=order_items,
        )
        self.db.add(order)
        self.db.flush()

        self.db.add(
            OrderStatusHistory(order_id=order.id, from_status=None, to_status=OrderStatus.PENDING, changed_by=user_id)
        )
        self.db.add(
            Payment(
                order_id=order.id,
                method=payload.payment_method,
                amount=grand_total,
                status=PaymentStatus.PENDING,
            )
        )

        self.db.commit()
        return self.get_order(order.id)

    # ---- reads ----

    def get_order(self, order_id: uuid.UUID) -> Order:
        order = self.db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
        ).scalar_one_or_none()
        if order is None:
            raise NotFoundError("Order not found.")
        return order

    # ---- status transitions ----

    def change_status(self, *, order_id: uuid.UUID, new_status: OrderStatus, user_id: uuid.UUID) -> Order:
        order = self.get_order(order_id)
        allowed = ORDER_STATUS_TRANSITIONS[order.status]
        if new_status not in allowed:
            raise ValidationError(
                f"Cannot move an order from '{order.status.value}' to '{new_status.value}'."
            )

        # Cancelling a not-yet-delivered order returns its stock to inventory.
        if new_status == OrderStatus.CANCELLED:
            for item in order.items:
                self.inventory.adjust(
                    product_id=item.product_id,
                    delta=item.quantity,
                    reason=f"order_cancelled:{order.order_number}",
                    user_id=user_id,
                )

        self.db.add(
            OrderStatusHistory(
                order_id=order.id, from_status=order.status, to_status=new_status, changed_by=user_id
            )
        )
        order.status = new_status
        self.db.commit()
        return self.get_order(order_id)

    # ---- reorder ----

    def reorder(self, *, customer: Customer, source_order_id: uuid.UUID, user_id: uuid.UUID) -> Order:
        source = self.get_order(source_order_id)
        if source.customer_id != customer.id:
            raise NotFoundError("Order not found.")

        from app.modules.orders.schemas import OrderCreate, OrderItemInput
        from app.modules.payments.models import Payment as _P  # noqa: F401

        payload = OrderCreate(
            items=[OrderItemInput(product_id=i.product_id, quantity=i.quantity) for i in source.items],
            payment_method=self._last_payment_method(source_order_id),
            delivery_address=source.delivery_address,
        )
        return self.place_order(customer=customer, payload=payload, user_id=user_id)

    # ---- helpers ----

    def _generate_order_number(self) -> str:
        # ORD-YYYYMMDD-XXXXXX (time-ordered, human-readable, collision-resistant enough for this scale)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        suffix = uuid.uuid4().hex[:6].upper()
        return f"ORD-{stamp}-{suffix}"

    def _last_payment_method(self, order_id: uuid.UUID):
        from app.modules.payments.models import Payment
        from app.shared.enums import PaymentMethod

        payment = self.db.execute(select(Payment).where(Payment.order_id == order_id)).scalar_one_or_none()
        return payment.method if payment else PaymentMethod.COD
