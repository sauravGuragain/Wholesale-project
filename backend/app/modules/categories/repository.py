import uuid

from sqlalchemy import select

from app.modules.categories.models import Brand, Category
from app.shared.repository import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    model = Category

    def list_all(self) -> list[Category]:
        return list(self.db.execute(self._base_query().order_by(Category.name)).scalars())

    def get_by_slug(self, slug: str) -> Category | None:
        return self.db.execute(self._base_query().where(Category.slug == slug)).scalar_one_or_none()

    def has_children(self, category_id: uuid.UUID) -> bool:
        stmt = self._base_query().where(Category.parent_id == category_id).limit(1)
        return self.db.execute(stmt).first() is not None


class BrandRepository(BaseRepository[Brand]):
    model = Brand

    def list_all(self) -> list[Brand]:
        return list(self.db.execute(select(Brand).order_by(Brand.name)).scalars())

    def get_by_name(self, name: str) -> Brand | None:
        return self.db.execute(select(Brand).where(Brand.name == name)).scalar_one_or_none()
