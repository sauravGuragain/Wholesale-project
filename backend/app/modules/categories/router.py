import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.categories.schemas import (
    BrandCreate,
    BrandOut,
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
)
from app.modules.categories.service import BrandService, CategoryService
from app.shared.enums import RoleName
from app.shared.schemas.base import MessageResponse

router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/categories", tags=["categories"])
brand_router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/brands", tags=["brands"])


# --- Categories ---
# Reads are available to any authenticated user (customers browse by category);
# writes are admin-only.

@router.get("", response_model=list[CategoryOut])
def list_categories(_=Depends(get_current_user), db: Session = Depends(get_db)) -> list[CategoryOut]:
    return [CategoryOut.model_validate(c) for c in CategoryService(db).list()]


@router.post("", response_model=CategoryOut, status_code=201, dependencies=[Depends(require_role(RoleName.ADMIN))])
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)) -> CategoryOut:
    return CategoryOut.model_validate(CategoryService(db).create(payload))


@router.patch("/{category_id}", response_model=CategoryOut, dependencies=[Depends(require_role(RoleName.ADMIN))])
def update_category(category_id: uuid.UUID, payload: CategoryUpdate, db: Session = Depends(get_db)) -> CategoryOut:
    return CategoryOut.model_validate(CategoryService(db).update(category_id, payload))


@router.delete("/{category_id}", response_model=MessageResponse, dependencies=[Depends(require_role(RoleName.ADMIN))])
def delete_category(category_id: uuid.UUID, db: Session = Depends(get_db)) -> MessageResponse:
    CategoryService(db).delete(category_id)
    return MessageResponse(detail="Category deleted.")


# --- Brands ---

@brand_router.get("", response_model=list[BrandOut])
def list_brands(_=Depends(get_current_user), db: Session = Depends(get_db)) -> list[BrandOut]:
    return [BrandOut.model_validate(b) for b in BrandService(db).list()]


@brand_router.post("", response_model=BrandOut, status_code=201, dependencies=[Depends(require_role(RoleName.ADMIN))])
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)) -> BrandOut:
    return BrandOut.model_validate(BrandService(db).create(payload))
