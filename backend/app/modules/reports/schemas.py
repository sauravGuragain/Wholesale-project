import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    todays_orders: int
    monthly_revenue: Decimal
    pending_orders: int
    completed_orders: int
    new_customers_this_month: int
    low_stock_count: int
    best_selling: list["BestSellingProduct"]


class BestSellingProduct(BaseModel):
    product_id: uuid.UUID
    product_name: str
    units_sold: int
    revenue: Decimal


class SalesBucket(BaseModel):
    period: str          # e.g. "2026-01-15" or "2026-01"
    orders: int
    revenue: Decimal


class SalesReport(BaseModel):
    from_date: date
    to_date: date
    group_by: str
    total_orders: int
    total_revenue: Decimal
    buckets: list[SalesBucket]


class CustomerReportRow(BaseModel):
    customer_id: uuid.UUID
    business_name: str
    total_orders: int
    total_spent: Decimal


class ProductReportRow(BaseModel):
    product_id: uuid.UUID
    product_name: str
    units_sold: int
    revenue: Decimal


DashboardSummary.model_rebuild()
