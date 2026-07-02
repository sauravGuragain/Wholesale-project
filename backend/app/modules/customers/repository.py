import uuid

from sqlalchemy import or_, select

from app.modules.customers.models import Customer
from app.shared.repository import BaseRepository


class CustomerRepository(BaseRepository[Customer]):
    model = Customer

    def get_by_user_id(self, user_id: uuid.UUID) -> Customer | None:
        stmt = self._base_query().where(Customer.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def search(self, *, term: str | None, page: int, page_size: int) -> tuple[list[Customer], int]:
        stmt = self._base_query().order_by(Customer.business_name)
        if term:
            like = f"%{term}%"
            stmt = stmt.where(
                or_(Customer.business_name.ilike(like), Customer.contact_person.ilike(like), Customer.phone.ilike(like))
            )
        return self.paginate(stmt, page=page, page_size=page_size)
