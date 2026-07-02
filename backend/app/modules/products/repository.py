import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.modules.products.models import (
    CustomerPriceOverride,
    PriceGroup,
    PriceGroupPrice,
    Product,
)
from app.shared.repository import BaseRepository


class ProductRepository(BaseRepository[Product]):
    model = Product

    def get_with_images(self, product_id: uuid.UUID) -> Product | None:
        stmt = self._base_query().options(selectinload(Product.images)).where(Product.id == product_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_sku(self, sku: str) -> Product | None:
        return self.db.execute(self._base_query().where(Product.sku == sku)).scalar_one_or_none()

    def sku_exists(self, sku: str) -> bool:
        return self.get_by_sku(sku) is not None

    def search(
        self,
        *,
        term: str | None,
        category_id: uuid.UUID | None,
        brand_id: uuid.UUID | None,
        active_only: bool,
        page: int,
        page_size: int,
    ) -> tuple[list[Product], int]:
        stmt = self._base_query().options(selectinload(Product.images)).order_by(Product.name)
        if active_only:
            stmt = stmt.where(Product.is_active.is_(True))
        if term:
            like = f"%{term}%"
            # Search covers name, SKU, and barcode per the requirements.
            stmt = stmt.where(
                or_(Product.name.ilike(like), Product.sku.ilike(like), Product.barcode.ilike(like))
            )
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        if brand_id:
            stmt = stmt.where(Product.brand_id == brand_id)
        return self.paginate(stmt, page=page, page_size=page_size)

    def all_active(self) -> list[Product]:
        return list(self.db.execute(self._base_query().where(Product.is_active.is_(True))).scalars())


class PricingRepository:
    """Admin-side writes to the price-group and customer-override tables."""

    def __init__(self, db) -> None:
        self.db = db

    def upsert_group_price(self, *, price_group_id, product_id, price) -> PriceGroupPrice:
        row = self.db.execute(
            select(PriceGroupPrice).where(
                PriceGroupPrice.price_group_id == price_group_id, PriceGroupPrice.product_id == product_id
            )
        ).scalar_one_or_none()
        if row is None:
            row = PriceGroupPrice(price_group_id=price_group_id, product_id=product_id, price=price)
            self.db.add(row)
        else:
            row.price = price
        self.db.flush()
        return row

    def upsert_customer_override(self, *, customer_id, product_id, price) -> CustomerPriceOverride:
        row = self.db.execute(
            select(CustomerPriceOverride).where(
                CustomerPriceOverride.customer_id == customer_id, CustomerPriceOverride.product_id == product_id
            )
        ).scalar_one_or_none()
        if row is None:
            row = CustomerPriceOverride(customer_id=customer_id, product_id=product_id, price=price)
            self.db.add(row)
        else:
            row.price = price
        self.db.flush()
        return row

    def list_groups(self) -> list[PriceGroup]:
        return list(self.db.execute(select(PriceGroup).order_by(PriceGroup.name)).scalars())

    def create_group(self, *, name, description) -> PriceGroup:
        group = PriceGroup(name=name, description=description)
        self.db.add(group)
        self.db.flush()
        return group

    def get_group_by_name(self, name: str) -> PriceGroup | None:
        return self.db.execute(select(PriceGroup).where(PriceGroup.name == name)).scalar_one_or_none()
