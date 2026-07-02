"""
End-to-end order flow test through the service layer:
  * places an order, verifying pricing + totals + tax
  * confirms stock is decremented
  * confirms an out-of-stock order is rejected atomically
  * confirms cancelling restores stock
"""
from decimal import Decimal

import pytest

from app.core.exceptions import InsufficientStockError
from app.core.security import hash_password
from app.modules.categories.models import Category
from app.modules.customers.models import Customer
from app.modules.inventory.models import Inventory
from app.modules.orders.schemas import OrderCreate, OrderItemInput
from app.modules.orders.service import OrderService
from app.modules.products.models import Product
from app.modules.users.models import Role, User
from app.shared.enums import OrderStatus, PaymentMethod


def _setup(db, *, stock=50, price="100.00", tax="13.00"):
    role = db.query(Role).filter_by(name="customer").one()
    user = User(username="acme", password_hash=hash_password("password123"), role_id=role.id)
    db.add(user)
    db.flush()
    customer = Customer(user_id=user.id, business_name="Acme Traders")
    db.add(customer)
    db.flush()

    cat = Category(name="Snacks", slug="snacks")
    db.add(cat)
    db.flush()
    product = Product(
        name="Biscuit", sku="BISC-1", category_id=cat.id, selling_price=Decimal(price), tax_rate=Decimal(tax), unit="pack"
    )
    db.add(product)
    db.flush()
    db.add(Inventory(product_id=product.id, quantity_on_hand=stock, reorder_threshold=5))
    db.commit()
    return customer, product


def test_place_order_computes_totals_and_decrements_stock(db_session):
    customer, product = _setup(db_session, stock=50, price="100.00", tax="13.00")
    payload = OrderCreate(
        items=[OrderItemInput(product_id=product.id, quantity=3)],
        payment_method=PaymentMethod.COD,
    )

    order = OrderService(db_session).place_order(customer=customer, payload=payload, user_id=customer.user_id)

    assert order.subtotal == Decimal("300.00")
    assert order.tax_total == Decimal("39.00")  # 13% of 300
    assert order.grand_total == Decimal("339.00")
    assert order.status == OrderStatus.PENDING
    assert len(order.items) == 1

    inv = db_session.query(Inventory).filter_by(product_id=product.id).one()
    assert inv.quantity_on_hand == 47


def test_order_rejected_when_insufficient_stock(db_session):
    customer, product = _setup(db_session, stock=2)
    payload = OrderCreate(
        items=[OrderItemInput(product_id=product.id, quantity=5)],
        payment_method=PaymentMethod.COD,
    )

    with pytest.raises(InsufficientStockError):
        OrderService(db_session).place_order(customer=customer, payload=payload, user_id=customer.user_id)

    # Rollback happened — stock untouched, no order persisted.
    db_session.rollback()
    inv = db_session.query(Inventory).filter_by(product_id=product.id).one()
    assert inv.quantity_on_hand == 2


def test_cancelling_order_restores_stock(db_session):
    customer, product = _setup(db_session, stock=20)
    payload = OrderCreate(
        items=[OrderItemInput(product_id=product.id, quantity=4)],
        payment_method=PaymentMethod.COD,
    )
    svc = OrderService(db_session)
    order = svc.place_order(customer=customer, payload=payload, user_id=customer.user_id)
    assert db_session.query(Inventory).filter_by(product_id=product.id).one().quantity_on_hand == 16

    svc.change_status(order_id=order.id, new_status=OrderStatus.CANCELLED, user_id=customer.user_id)
    assert db_session.query(Inventory).filter_by(product_id=product.id).one().quantity_on_hand == 20


def test_illegal_status_transition_rejected(db_session):
    from app.core.exceptions import ValidationError

    customer, product = _setup(db_session, stock=20)
    payload = OrderCreate(
        items=[OrderItemInput(product_id=product.id, quantity=1)],
        payment_method=PaymentMethod.COD,
    )
    svc = OrderService(db_session)
    order = svc.place_order(customer=customer, payload=payload, user_id=customer.user_id)

    # pending -> delivered is not a legal single step
    with pytest.raises(ValidationError):
        svc.change_status(order_id=order.id, new_status=OrderStatus.DELIVERED, user_id=customer.user_id)
