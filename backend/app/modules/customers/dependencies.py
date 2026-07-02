"""Dependency: resolve the Customer profile for the currently authenticated customer user."""
from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import AuthorizationError
from app.modules.customers.models import Customer
from app.modules.customers.repository import CustomerRepository
from app.modules.users.models import User
from app.shared.enums import RoleName


def get_current_customer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Customer:
    if current_user.role.name != RoleName.CUSTOMER.value:
        raise AuthorizationError("This action is only available to customer accounts.")
    customer = CustomerRepository(db).get_by_user_id(current_user.id)
    if customer is None:
        raise AuthorizationError("No customer profile linked to this account.")
    return customer
