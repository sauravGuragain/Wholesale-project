import uuid

from pydantic import BaseModel, Field

from app.shared.schemas.base import ORMBaseSchema


class StockAdjustInput(BaseModel):
    delta: int = Field(description="Positive to add stock, negative to remove")
    reason: str = Field(min_length=1, max_length=255)


class ReorderThresholdInput(BaseModel):
    reorder_threshold: int = Field(ge=0)


class InventoryOut(ORMBaseSchema):
    product_id: uuid.UUID
    quantity_on_hand: int
    reorder_threshold: int


class LowStockItem(BaseModel):
    product_id: uuid.UUID
    product_name: str
    sku: str
    quantity_on_hand: int
    reorder_threshold: int
