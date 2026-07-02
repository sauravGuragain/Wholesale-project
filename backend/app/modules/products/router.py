import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.storage import get_storage
from app.modules.customers.dependencies import get_current_customer
from app.modules.customers.models import Customer
from app.modules.products.schemas import (
    BulkPriceImportResult,
    CustomerPriceOverrideSet,
    PriceGroupCreate,
    PriceGroupOut,
    PriceGroupPriceSet,
    ProductCatalogItem,
    ProductCreate,
    ProductImageOut,
    ProductOut,
    ProductUpdate,
)
from app.modules.products.service import PricingAdminService, ProductService
from app.shared.enums import RoleName
from app.shared.schemas.base import MessageResponse, PaginatedResponse
from app.shared.utils.file_upload import read_validated_image
from app.shared.utils.pagination import clamp_pagination

router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/products", tags=["products"])
admin_dep = Depends(require_role(RoleName.ADMIN))


def _to_product_out(product) -> ProductOut:
    storage = get_storage()
    return ProductOut(
        id=product.id,
        name=product.name,
        sku=product.sku,
        barcode=product.barcode,
        category_id=product.category_id,
        brand_id=product.brand_id,
        unit=product.unit,
        cost_price=product.cost_price,
        selling_price=product.selling_price,
        tax_rate=product.tax_rate,
        is_active=product.is_active,
        created_at=product.created_at,
        images=[
            ProductImageOut(id=i.id, url=storage.url_for(i.storage_key), is_primary=i.is_primary, sort_order=i.sort_order)
            for i in product.images
        ],
    )


# ----------------------- Admin: product CRUD -----------------------

@router.post("", response_model=ProductOut, status_code=201, dependencies=[admin_dep])
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> ProductOut:
    return _to_product_out(ProductService(db).create(payload))


@router.patch("/{product_id}", response_model=ProductOut, dependencies=[admin_dep])
def update_product(product_id: uuid.UUID, payload: ProductUpdate, db: Session = Depends(get_db)) -> ProductOut:
    return _to_product_out(ProductService(db).update(product_id, payload))


@router.delete("/{product_id}", response_model=MessageResponse, dependencies=[admin_dep])
def delete_product(product_id: uuid.UUID, db: Session = Depends(get_db)) -> MessageResponse:
    ProductService(db).delete(product_id)
    return MessageResponse(detail="Product deleted.")


@router.get("/admin", response_model=PaginatedResponse[ProductOut], dependencies=[admin_dep])
def admin_list_products(
    search: str | None = None,
    category_id: uuid.UUID | None = None,
    brand_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ProductOut]:
    page, page_size = clamp_pagination(page, page_size)
    items, total = ProductService(db).search(
        term=search, category_id=category_id, brand_id=brand_id, active_only=False, page=page, page_size=page_size
    )
    return PaginatedResponse(items=[_to_product_out(p) for p in items], total=total, page=page, page_size=page_size)


# ----------------------- Admin: images -----------------------

@router.post("/{product_id}/images", response_model=ProductImageOut, status_code=201, dependencies=[admin_dep])
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    is_primary: bool = False,
    db: Session = Depends(get_db),
) -> ProductImageOut:
    file_bytes, filename, content_type = await read_validated_image(file)
    image = ProductService(db).add_image(
        product_id, file_bytes=file_bytes, filename=filename, content_type=content_type, is_primary=is_primary
    )
    return ProductImageOut(
        id=image.id, url=get_storage().url_for(image.storage_key), is_primary=image.is_primary, sort_order=image.sort_order
    )


@router.delete("/{product_id}/images/{image_id}", response_model=MessageResponse, dependencies=[admin_dep])
def delete_product_image(product_id: uuid.UUID, image_id: uuid.UUID, db: Session = Depends(get_db)) -> MessageResponse:
    ProductService(db).delete_image(product_id, image_id)
    return MessageResponse(detail="Image deleted.")


# ----------------------- Admin: bulk price Excel -----------------------

@router.get("/prices/export", dependencies=[admin_dep])
def export_prices(db: Session = Depends(get_db)) -> StreamingResponse:
    content = ProductService(db).export_prices()
    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=prices.xlsx"},
    )


@router.post("/prices/import", response_model=BulkPriceImportResult, dependencies=[admin_dep])
async def import_prices(file: UploadFile = File(...), db: Session = Depends(get_db)) -> BulkPriceImportResult:
    file_bytes = await file.read()
    updated, skipped, errors = ProductService(db).import_prices(file_bytes)
    return BulkPriceImportResult(updated=updated, skipped=skipped, errors=errors)


# ----------------------- Admin: pricing management -----------------------

@router.post("/price-groups", response_model=PriceGroupOut, status_code=201, dependencies=[admin_dep])
def create_price_group(payload: PriceGroupCreate, db: Session = Depends(get_db)) -> PriceGroupOut:
    group = PricingAdminService(db).create_group(name=payload.name, description=payload.description)
    return PriceGroupOut.model_validate(group)


@router.get("/price-groups", response_model=list[PriceGroupOut], dependencies=[admin_dep])
def list_price_groups(db: Session = Depends(get_db)) -> list[PriceGroupOut]:
    return [PriceGroupOut.model_validate(g) for g in PricingAdminService(db).list_groups()]


@router.put("/price-groups/{price_group_id}/price", response_model=MessageResponse, dependencies=[admin_dep])
def set_group_price(price_group_id: uuid.UUID, payload: PriceGroupPriceSet, db: Session = Depends(get_db)) -> MessageResponse:
    PricingAdminService(db).set_group_price(
        price_group_id=price_group_id, product_id=payload.product_id, price=payload.price
    )
    return MessageResponse(detail="Price group price set.")


@router.put("/customer-price-override", response_model=MessageResponse, dependencies=[admin_dep])
def set_customer_override(payload: CustomerPriceOverrideSet, db: Session = Depends(get_db)) -> MessageResponse:
    PricingAdminService(db).set_customer_override(
        customer_id=payload.customer_id, product_id=payload.product_id, price=payload.price
    )
    return MessageResponse(detail="Customer-specific price set.")


# ----------------------- Customer: catalog -----------------------

@router.get("", response_model=PaginatedResponse[ProductCatalogItem])
def browse_catalog(
    search: str | None = None,
    category_id: uuid.UUID | None = None,
    brand_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1),
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ProductCatalogItem]:
    page, page_size = clamp_pagination(page, page_size)
    items, total = ProductService(db).catalog(
        customer=customer, term=search, category_id=category_id, brand_id=brand_id, page=page, page_size=page_size
    )
    return PaginatedResponse(
        items=[ProductCatalogItem(**i) for i in items], total=total, page=page, page_size=page_size
    )
