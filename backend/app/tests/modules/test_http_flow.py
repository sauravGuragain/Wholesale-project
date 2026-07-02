"""
Full HTTP-stack tests through TestClient: exercises auth, RBAC guards, and a
realistic admin-then-customer flow. Complements the service-level tests.
"""
from app.core.security import hash_password
from app.modules.customers.models import Customer
from app.modules.users.models import Role, User


def _seed_admin(db) -> None:
    role = db.query(Role).filter_by(name="admin").one()
    db.add(User(username="admin", password_hash=hash_password("password123"), role_id=role.id))
    db.commit()


def _seed_customer(db) -> None:
    role = db.query(Role).filter_by(name="customer").one()
    u = User(username="buyer", password_hash=hash_password("password123"), role_id=role.id)
    db.add(u)
    db.flush()
    db.add(Customer(user_id=u.id, business_name="Buyer Co"))
    db.commit()


def _login(client, username, password="password123") -> str:
    r = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_admin_creates_product_and_customer_browses(client, db_session):
    _seed_admin(db_session)
    _seed_customer(db_session)

    admin_token = _login(client, "admin")
    admin_h = {"Authorization": f"Bearer {admin_token}"}

    # Create a category, then a product.
    cat = client.post("/api/v1/categories", json={"name": "Noodles"}, headers=admin_h)
    assert cat.status_code == 201, cat.text
    cat_id = cat.json()["id"]

    prod = client.post(
        "/api/v1/products",
        json={"name": "Instant Noodles", "sku": "NDL-1", "category_id": cat_id, "selling_price": "25.00", "tax_rate": "5"},
        headers=admin_h,
    )
    assert prod.status_code == 201, prod.text
    prod_id = prod.json()["id"]

    # Give it stock.
    adj = client.post(f"/api/v1/inventory/{prod_id}/adjust", json={"delta": 100, "reason": "initial"}, headers=admin_h)
    assert adj.status_code == 200, adj.text

    # Customer browses the catalog and sees the product with resolved price + stock.
    cust_token = _login(client, "buyer")
    cust_h = {"Authorization": f"Bearer {cust_token}"}
    catalog = client.get("/api/v1/products", headers=cust_h)
    assert catalog.status_code == 200, catalog.text
    body = catalog.json()
    assert body["total"] == 1
    assert body["items"][0]["price"] == "25.00"
    assert body["items"][0]["in_stock"] is True


def test_customer_cannot_create_product(client, db_session):
    _seed_customer(db_session)
    token = _login(client, "buyer")
    r = client.post(
        "/api/v1/products",
        json={"name": "X", "sku": "X-1", "category_id": "00000000-0000-0000-0000-000000000000", "selling_price": "1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_full_checkout_over_http(client, db_session):
    _seed_admin(db_session)
    _seed_customer(db_session)
    admin_h = {"Authorization": f"Bearer {_login(client, 'admin')}"}

    cat_id = client.post("/api/v1/categories", json={"name": "Flour"}, headers=admin_h).json()["id"]
    prod_id = client.post(
        "/api/v1/products",
        json={"name": "Wheat Flour 10kg", "sku": "FLR-1", "category_id": cat_id, "selling_price": "80.00"},
        headers=admin_h,
    ).json()["id"]
    client.post(f"/api/v1/inventory/{prod_id}/adjust", json={"delta": 50, "reason": "initial"}, headers=admin_h)

    cust_h = {"Authorization": f"Bearer {_login(client, 'buyer')}"}
    order = client.post(
        "/api/v1/orders",
        json={"items": [{"product_id": prod_id, "quantity": 3}], "payment_method": "cod"},
        headers=cust_h,
    )
    assert order.status_code == 201, order.text
    assert order.json()["grand_total"] == "240.00"

    # Admin advances the order.
    order_id = order.json()["id"]
    r = client.patch(f"/api/v1/orders/{order_id}/status", json={"status": "confirmed"}, headers=admin_h)
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"
