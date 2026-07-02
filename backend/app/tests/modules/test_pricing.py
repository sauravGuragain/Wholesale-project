"""
Verifies the pricing precedence rule end to end:
    customer override  >  price group price  >  default product price
"""
from decimal import Decimal

from app.core.security import hash_password
from app.modules.customers.models import Customer
from app.modules.products.models import (
    CustomerPriceOverride,
    PriceGroup,
    PriceGroupPrice,
    Product,
)
from app.modules.products.pricing import resolve_price
from app.modules.users.models import Role, User


def _make_customer(db, *, with_group: bool):
    role = db.query(Role).filter_by(name="customer").one()
    user = User(username="acme", password_hash=hash_password("password123"), role_id=role.id)
    db.add(user)
    db.flush()

    group = None
    if with_group:
        group = PriceGroup(name="wholesale")
        db.add(group)
        db.flush()

    customer = Customer(
        user_id=user.id,
        business_name="Acme Traders",
        price_group_id=group.id if group else None,
    )
    db.add(customer)
    db.flush()
    return customer, group


def _make_product(db, price="100.00"):
    # categories are required FK; create a minimal one
    from app.modules.categories.models import Category

    cat = Category(name="Snacks", slug="snacks")
    db.add(cat)
    db.flush()
    product = Product(name="Biscuit", sku="BISC-1", category_id=cat.id, selling_price=Decimal(price), unit="pack")
    db.add(product)
    db.flush()
    return product


def test_default_price_when_no_group_no_override(db_session):
    customer, _ = _make_customer(db_session, with_group=False)
    product = _make_product(db_session, price="100.00")

    resolved = resolve_price(db_session, customer=customer, product=product)
    assert resolved.price == Decimal("100.00")
    assert resolved.source == "default"


def test_price_group_beats_default(db_session):
    customer, group = _make_customer(db_session, with_group=True)
    product = _make_product(db_session, price="100.00")
    db_session.add(PriceGroupPrice(price_group_id=group.id, product_id=product.id, price=Decimal("90.00")))
    db_session.flush()

    resolved = resolve_price(db_session, customer=customer, product=product)
    assert resolved.price == Decimal("90.00")
    assert resolved.source == "price_group"


def test_customer_override_beats_everything(db_session):
    customer, group = _make_customer(db_session, with_group=True)
    product = _make_product(db_session, price="100.00")
    db_session.add(PriceGroupPrice(price_group_id=group.id, product_id=product.id, price=Decimal("90.00")))
    db_session.add(CustomerPriceOverride(customer_id=customer.id, product_id=product.id, price=Decimal("80.00")))
    db_session.flush()

    resolved = resolve_price(db_session, customer=customer, product=product)
    assert resolved.price == Decimal("80.00")
    assert resolved.source == "customer_override"
