import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.customers.schemas import CustomerCreate, CustomerOut, CustomerUpdate
from app.modules.customers.service import CustomerService
from app.modules.users.service import UserService
from app.shared.enums import RoleName
from app.shared.schemas.base import MessageResponse, PaginatedResponse
from app.shared.utils.pagination import clamp_pagination

router = APIRouter(
    prefix=f"{settings.API_V1_PREFIX}/customers",
    tags=["customers"],
    dependencies=[Depends(require_role(RoleName.ADMIN))],
)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)) -> CustomerOut:
    return CustomerOut.model_validate(CustomerService(db).create(payload))


@router.get("", response_model=PaginatedResponse[CustomerOut])
def list_customers(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1),
    db: Session = Depends(get_db),
) -> PaginatedResponse[CustomerOut]:
    page, page_size = clamp_pagination(page, page_size)
    items, total = CustomerService(db).list(term=search, page=page, page_size=page_size)
    return PaginatedResponse(
        items=[CustomerOut.model_validate(c) for c in items], total=total, page=page, page_size=page_size
    )


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: uuid.UUID, payload: CustomerUpdate, db: Session = Depends(get_db)) -> CustomerOut:
    return CustomerOut.model_validate(CustomerService(db).update(customer_id, payload))


@router.patch("/{customer_id}/disable", response_model=CustomerOut)
def disable_customer(customer_id: uuid.UUID, db: Session = Depends(get_db)) -> CustomerOut:
    return CustomerOut.model_validate(CustomerService(db).update(customer_id, CustomerUpdate(is_active=False)))


@router.post("/{customer_id}/reset-password", response_model=MessageResponse)
def reset_customer_password(
    customer_id: uuid.UUID, payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    customer = CustomerService(db).repo.get_by_id(customer_id)
    if customer is None:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Customer not found.")
    UserService(db).reset_password(customer.user_id, payload.new_password)
    return MessageResponse(detail="Password reset successfully.")
