"""
Customer service.

Creating a customer provisions BOTH a login (users row, role=customer) and a
business profile (customers row) in one transaction. There is deliberately no
public path to this — only an admin can call it.
"""
import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.security import hash_password
from app.modules.customers.models import Customer
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate
from app.modules.users.models import User
from app.modules.users.repository import RefreshTokenRepository, UserRepository
from app.shared.enums import RoleName


class CustomerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CustomerRepository(db)
        self.users = UserRepository(db)

    def create(self, payload: CustomerCreate) -> Customer:
        if self.users.username_exists(payload.username):
            raise ConflictError(f"Username '{payload.username}' is already taken.")

        role = self.users.get_role_by_name(RoleName.CUSTOMER.value)
        if role is None:
            raise ValidationError("Customer role is not seeded. Run the seed script.")

        user = User(
            username=payload.username,
            password_hash=hash_password(payload.password),
            role_id=role.id,
        )
        self.users.add(user)

        customer = Customer(
            user_id=user.id,
            business_name=payload.business_name,
            contact_person=payload.contact_person,
            phone=payload.phone,
            address=payload.address,
            price_group_id=payload.price_group_id,
            credit_limit=payload.credit_limit,
        )
        self.repo.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def update(self, customer_id: uuid.UUID, payload: CustomerUpdate) -> Customer:
        customer = self.repo.get_by_id(customer_id)
        if customer is None:
            raise NotFoundError("Customer not found.")

        for field, value in payload.model_dump(exclude_unset=True).items():
            if field == "is_active":
                continue
            setattr(customer, field, value)

        if payload.is_active is not None:
            customer.is_active = payload.is_active
            # Keep the login in lockstep and force-logout if disabled.
            customer.user.is_active = payload.is_active
            if not payload.is_active:
                RefreshTokenRepository(self.db).revoke_all_for_user(customer.user_id)

        self.db.commit()
        self.db.refresh(customer)
        return customer

    def list(self, *, term: str | None, page: int, page_size: int):
        return self.repo.search(term=term, page=page, page_size=page_size)
