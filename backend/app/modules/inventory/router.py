import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.inventory.schemas import (
    InventoryOut,
    LowStockItem,
    ReorderThresholdInput,
    StockAdjustInput,
)
from app.modules.inventory.service import InventoryService
from app.modules.users.models import User
from app.shared.enums import RoleName

router = APIRouter(
    prefix=f"{settings.API_V1_PREFIX}/inventory",
    tags=["inventory"],
    dependencies=[Depends(require_role(RoleName.ADMIN))],
)


@router.get("/low-stock", response_model=list[LowStockItem])
def low_stock(db: Session = Depends(get_db)) -> list[LowStockItem]:
    return [LowStockItem(**row) for row in InventoryService(db).low_stock_detailed()]


@router.get("/{product_id}", response_model=InventoryOut)
def get_inventory(product_id: uuid.UUID, db: Session = Depends(get_db)) -> InventoryOut:
    return InventoryOut.model_validate(InventoryService(db).get(product_id))


@router.post("/{product_id}/adjust", response_model=InventoryOut)
def adjust_stock(
    product_id: uuid.UUID,
    payload: StockAdjustInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InventoryOut:
    svc = InventoryService(db)
    inv = svc.adjust(product_id=product_id, delta=payload.delta, reason=payload.reason, user_id=current_user.id)
    db.commit()
    return InventoryOut.model_validate(inv)


@router.put("/{product_id}/threshold", response_model=InventoryOut)
def set_threshold(product_id: uuid.UUID, payload: ReorderThresholdInput, db: Session = Depends(get_db)) -> InventoryOut:
    svc = InventoryService(db)
    inv = svc.set_threshold(product_id=product_id, reorder_threshold=payload.reorder_threshold)
    db.commit()
    return InventoryOut.model_validate(inv)
