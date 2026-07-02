"""
Product service.

Covers admin CRUD, image upload (through the storage abstraction, so it works
identically on local disk or S3), the customer-facing catalog (prices resolved
per-customer via the central pricing rule, stock joined in), pricing-table
management, and bulk Excel price import/export.
"""
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.storage import StoredFile, get_storage
from app.modules.categories.repository import CategoryRepository
from app.modules.customers.models import Customer
from app.modules.inventory.models import Inventory
from app.modules.inventory.service import InventoryService
from app.modules.products.models import Product, ProductImage
from app.modules.products.pricing import resolve_prices
from app.modules.products.repository import PricingRepository, ProductRepository
from app.modules.products.schemas import ProductCreate, ProductUpdate
from app.shared.utils.excel import build_price_export, parse_price_import


class ProductService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = ProductRepository(db)
        self.inventory = InventoryService(db)

    # ---- CRUD ----

    def create(self, payload: ProductCreate) -> Product:
        if self.repo.sku_exists(payload.sku):
            raise ConflictError(f"SKU '{payload.sku}' already exists.")
        if CategoryRepository(self.db).get_by_id(payload.category_id) is None:
            raise ValidationError("Category does not exist.")

        product = Product(**payload.model_dump())
        self.repo.add(product)
        # Create the inventory row up front so low-stock reporting is consistent.
        self.inventory.get_or_create(product.id)
        self.db.commit()
        return self.repo.get_with_images(product.id)

    def update(self, product_id: uuid.UUID, payload: ProductUpdate) -> Product:
        product = self.repo.get_by_id(product_id)
        if product is None:
            raise NotFoundError("Product not found.")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(product, field, value)
        self.db.commit()
        return self.repo.get_with_images(product_id)

    def delete(self, product_id: uuid.UUID) -> None:
        product = self.repo.get_by_id(product_id)
        if product is None:
            raise NotFoundError("Product not found.")
        self.repo.delete(product)  # soft delete — historical orders keep referencing it
        self.db.commit()

    def get(self, product_id: uuid.UUID) -> Product:
        product = self.repo.get_with_images(product_id)
        if product is None:
            raise NotFoundError("Product not found.")
        return product

    def search(self, **kwargs):
        return self.repo.search(**kwargs)

    # ---- images ----

    def add_image(self, product_id: uuid.UUID, *, file_bytes: bytes, filename: str, content_type: str, is_primary: bool) -> ProductImage:
        product = self.repo.get_with_images(product_id)
        if product is None:
            raise NotFoundError("Product not found.")

        stored: StoredFile = get_storage().save(
            file_bytes=file_bytes, filename=filename, content_type=content_type, folder="products"
        )
        # If this is the first image, make it primary regardless.
        make_primary = is_primary or len(product.images) == 0
        if make_primary:
            for img in product.images:
                img.is_primary = False

        image = ProductImage(
            product_id=product_id,
            storage_key=stored.key,
            is_primary=make_primary,
            sort_order=len(product.images),
        )
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def delete_image(self, product_id: uuid.UUID, image_id: uuid.UUID) -> None:
        image = self.db.execute(
            select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
        ).scalar_one_or_none()
        if image is None:
            raise NotFoundError("Image not found.")
        get_storage().delete(image.storage_key)
        self.db.delete(image)
        self.db.commit()

    # ---- catalog (customer-facing, resolved pricing + stock) ----

    def catalog(self, *, customer: Customer, term, category_id, brand_id, page, page_size) -> tuple[list[dict], int]:
        products, total = self.repo.search(
            term=term, category_id=category_id, brand_id=brand_id, active_only=True, page=page, page_size=page_size
        )
        prices = resolve_prices(self.db, customer=customer, products=products)

        product_ids = [p.id for p in products]
        stock_map = {}
        if product_ids:
            for inv in self.db.execute(select(Inventory).where(Inventory.product_id.in_(product_ids))).scalars():
                stock_map[inv.product_id] = inv.quantity_on_hand

        items = []
        for p in products:
            qty = stock_map.get(p.id, 0)
            rp = prices[p.id]
            items.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "unit": p.unit,
                    "tax_rate": p.tax_rate,
                    "price": rp.price,
                    "price_source": rp.source,
                    "in_stock": qty > 0,
                    "quantity_available": qty,
                    "images": [
                        {"id": img.id, "url": get_storage().url_for(img.storage_key), "is_primary": img.is_primary, "sort_order": img.sort_order}
                        for img in p.images
                    ],
                }
            )
        return items, total

    # ---- bulk Excel ----

    def export_prices(self) -> bytes:
        return build_price_export(self.repo.all_active())

    def import_prices(self, file_bytes: bytes) -> tuple[int, int, list[str]]:
        parsed = parse_price_import(file_bytes)
        updated = 0
        skipped = 0
        errors = list(parsed.errors)

        for row in parsed.rows:
            product = self.repo.get_by_sku(row.sku)
            if product is None:
                skipped += 1
                errors.append(f"SKU '{row.sku}': no matching product.")
                continue
            if row.cost_price is not None:
                product.cost_price = row.cost_price
            if row.selling_price is not None:
                product.selling_price = row.selling_price
            if row.tax_rate is not None:
                product.tax_rate = row.tax_rate
            updated += 1

        self.db.commit()
        return updated, skipped, errors


class PricingAdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = PricingRepository(db)

    def create_group(self, *, name: str, description: str | None):
        if self.repo.get_group_by_name(name) is not None:
            raise ConflictError(f"Price group '{name}' already exists.")
        group = self.repo.create_group(name=name, description=description)
        self.db.commit()
        self.db.refresh(group)
        return group

    def list_groups(self):
        return self.repo.list_groups()

    def set_group_price(self, *, price_group_id: uuid.UUID, product_id: uuid.UUID, price: Decimal):
        row = self.repo.upsert_group_price(price_group_id=price_group_id, product_id=product_id, price=price)
        self.db.commit()
        return row

    def set_customer_override(self, *, customer_id: uuid.UUID, product_id: uuid.UUID, price: Decimal):
        row = self.repo.upsert_customer_override(customer_id=customer_id, product_id=product_id, price=price)
        self.db.commit()
        return row
