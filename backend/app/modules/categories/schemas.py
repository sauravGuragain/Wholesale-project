import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.shared.schemas.base import ORMBaseSchema


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: uuid.UUID | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    parent_id: uuid.UUID | None = None


class CategoryOut(ORMBaseSchema):
    id: uuid.UUID
    name: str
    slug: str
    parent_id: uuid.UUID | None
    created_at: datetime


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class BrandOut(ORMBaseSchema):
    id: uuid.UUID
    name: str
