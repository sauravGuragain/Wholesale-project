"""Category and brand management. Slugs are generated and de-duplicated automatically."""
import re
import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.modules.categories.models import Brand, Category
from app.modules.categories.repository import BrandRepository, CategoryRepository
from app.modules.categories.schemas import BrandCreate, CategoryCreate, CategoryUpdate


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "category"


class CategoryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CategoryRepository(db)

    def _unique_slug(self, name: str) -> str:
        base = _slugify(name)
        slug = base
        i = 2
        while self.repo.get_by_slug(slug) is not None:
            slug = f"{base}-{i}"
            i += 1
        return slug

    def create(self, payload: CategoryCreate) -> Category:
        if payload.parent_id is not None and self.repo.get_by_id(payload.parent_id) is None:
            raise ValidationError("Parent category does not exist.")
        category = Category(name=payload.name, slug=self._unique_slug(payload.name), parent_id=payload.parent_id)
        self.repo.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update(self, category_id: uuid.UUID, payload: CategoryUpdate) -> Category:
        category = self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Category not found.")
        if payload.parent_id == category_id:
            raise ValidationError("A category cannot be its own parent.")
        if payload.name is not None:
            category.name = payload.name
        if payload.parent_id is not None:
            category.parent_id = payload.parent_id
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category_id: uuid.UUID) -> None:
        category = self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Category not found.")
        if self.repo.has_children(category_id):
            raise ConflictError("Cannot delete a category that has subcategories.")
        self.repo.delete(category)  # soft delete
        self.db.commit()

    def list(self) -> list[Category]:
        return self.repo.list_all()


class BrandService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = BrandRepository(db)

    def create(self, payload: BrandCreate) -> Brand:
        if self.repo.get_by_name(payload.name) is not None:
            raise ConflictError(f"Brand '{payload.name}' already exists.")
        brand = Brand(name=payload.name)
        self.repo.add(brand)
        self.db.commit()
        self.db.refresh(brand)
        return brand

    def list(self) -> list[Brand]:
        return self.repo.list_all()
