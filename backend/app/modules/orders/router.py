"""
Orders endpoints — shared path, role-differentiated behaviour:
  * customers create/list/reorder their OWN orders
  * admins list all orders and drive status transitions
"""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import NotFoundError
from app.modules.customers.dependencies import get_current_customer
from app.modules.customers.models import Customer
from app.modules.orders.models import Order
from app.modules.orders.schemas import OrderCreate, OrderOut, OrderStatusUpdate
from app.modules.orders.service import OrderService
from app.modules.users.models import User
from app.shared.enums import RoleName
from app.shared.schemas.base import PaginatedResponse
from app.shared.utils.pagination import clamp_pagination

router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=201)
def place_order(
    payload: OrderCreate,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = OrderService(db).place_order(customer=customer, payload=payload, user_id=customer.user_id)
    return OrderOut.model_validate(order)


@router.get("", response_model=PaginatedResponse[OrderOut])
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[OrderOut]:
    page, page_size = clamp_pagination(page, page_size)
    stmt = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())

    # Customers only ever see their own orders; admins see everything.
    if current_user.role.name == RoleName.CUSTOMER.value:
        customer = current_user.customer_profile
        if customer is None:
            return PaginatedResponse(items=[], total=0, page=page, page_size=page_size)
        stmt = stmt.where(Order.customer_id == customer.id)

    from sqlalchemy import func

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    orders = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedResponse(
        items=[OrderOut.model_validate(o) for o in orders], total=total, page=page, page_size=page_size
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = OrderService(db).get_order(order_id)
    if current_user.role.name == RoleName.CUSTOMER.value:
        customer = current_user.customer_profile
        if customer is None or order.customer_id != customer.id:
            raise NotFoundError("Order not found.")
    return OrderOut.model_validate(order)


@router.post("/{order_id}/reorder", response_model=OrderOut, status_code=201)
def reorder(
    order_id: uuid.UUID,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = OrderService(db).reorder(customer=customer, source_order_id=order_id, user_id=customer.user_id)
    return OrderOut.model_validate(order)


@router.patch("/{order_id}/status", response_model=OrderOut, dependencies=[Depends(require_role(RoleName.ADMIN))])
def update_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = OrderService(db).change_status(order_id=order_id, new_status=payload.status, user_id=current_user.id)
    return OrderOut.model_validate(order)
