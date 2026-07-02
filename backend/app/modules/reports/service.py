"""
Reporting service.

Only 'delivered' orders count toward revenue in reports, so cancelled/pending
orders don't inflate figures. Dashboard revenue is month-to-date. Grouping in
the sales report is done in Python over fetched rows to stay database-portable
(the volumes here are wholesaler-scale, not analytics-warehouse scale).
"""
from collections import defaultdict
from datetime import date, datetime, time, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.customers.models import Customer
from app.modules.inventory.models import Inventory
from app.modules.orders.models import Order, OrderItem
from app.shared.enums import OrderStatus

REVENUE_STATUSES = (OrderStatus.DELIVERED,)


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ---- dashboard ----

    def dashboard(self) -> dict:
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        day_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)

        todays_orders = self.db.execute(
            select(func.count()).select_from(Order).where(Order.created_at >= day_start)
        ).scalar_one()

        monthly_revenue = self.db.execute(
            select(func.coalesce(func.sum(Order.grand_total), 0)).where(
                Order.status.in_(REVENUE_STATUSES), Order.created_at >= month_start
            )
        ).scalar_one()

        pending_orders = self.db.execute(
            select(func.count()).select_from(Order).where(Order.status == OrderStatus.PENDING)
        ).scalar_one()

        completed_orders = self.db.execute(
            select(func.count()).select_from(Order).where(Order.status == OrderStatus.DELIVERED)
        ).scalar_one()

        new_customers = self.db.execute(
            select(func.count()).select_from(Customer).where(Customer.created_at >= month_start)
        ).scalar_one()

        low_stock_count = self.db.execute(
            select(func.count()).select_from(Inventory).where(
                Inventory.quantity_on_hand <= Inventory.reorder_threshold
            )
        ).scalar_one()

        return {
            "todays_orders": todays_orders,
            "monthly_revenue": Decimal(monthly_revenue),
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "new_customers_this_month": new_customers,
            "low_stock_count": low_stock_count,
            "best_selling": self.best_selling(limit=5),
        }

    def best_selling(self, *, limit: int = 5) -> list[dict]:
        stmt = (
            select(
                OrderItem.product_id,
                func.max(OrderItem.product_name_snapshot).label("name"),
                func.sum(OrderItem.quantity).label("units"),
                func.sum(OrderItem.line_total).label("revenue"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.status.in_(REVENUE_STATUSES))
            .group_by(OrderItem.product_id)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(limit)
        )
        return [
            {"product_id": r.product_id, "product_name": r.name, "units_sold": int(r.units), "revenue": Decimal(r.revenue)}
            for r in self.db.execute(stmt).all()
        ]

    # ---- sales ----

    def sales(self, *, from_date: date, to_date: date, group_by: str) -> dict:
        start = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(to_date, time.max, tzinfo=timezone.utc)

        rows = self.db.execute(
            select(Order.created_at, Order.grand_total).where(
                Order.status.in_(REVENUE_STATUSES), Order.created_at >= start, Order.created_at <= end
            )
        ).all()

        def bucket_key(dt: datetime) -> str:
            if group_by == "monthly":
                return dt.strftime("%Y-%m")
            if group_by == "yearly":
                return dt.strftime("%Y")
            return dt.strftime("%Y-%m-%d")  # daily default

        agg_orders: dict[str, int] = defaultdict(int)
        agg_revenue: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        total_revenue = Decimal("0")
        for created_at, grand_total in rows:
            key = bucket_key(created_at)
            agg_orders[key] += 1
            agg_revenue[key] += Decimal(grand_total)
            total_revenue += Decimal(grand_total)

        buckets = [
            {"period": k, "orders": agg_orders[k], "revenue": agg_revenue[k]} for k in sorted(agg_orders.keys())
        ]
        return {
            "from_date": from_date,
            "to_date": to_date,
            "group_by": group_by,
            "total_orders": len(rows),
            "total_revenue": total_revenue,
            "buckets": buckets,
        }

    # ---- customers ----

    def customers(self, *, limit: int = 50) -> list[dict]:
        stmt = (
            select(
                Customer.id,
                Customer.business_name,
                func.count(Order.id).label("orders"),
                func.coalesce(func.sum(Order.grand_total), 0).label("spent"),
            )
            .outerjoin(Order, (Order.customer_id == Customer.id) & (Order.status.in_(REVENUE_STATUSES)))
            .group_by(Customer.id, Customer.business_name)
            .order_by(func.coalesce(func.sum(Order.grand_total), 0).desc())
            .limit(limit)
        )
        return [
            {"customer_id": r.id, "business_name": r.business_name, "total_orders": int(r.orders), "total_spent": Decimal(r.spent)}
            for r in self.db.execute(stmt).all()
        ]

    # ---- products ----

    def products(self, *, limit: int = 50) -> list[dict]:
        stmt = (
            select(
                OrderItem.product_id,
                func.max(OrderItem.product_name_snapshot).label("name"),
                func.sum(OrderItem.quantity).label("units"),
                func.sum(OrderItem.line_total).label("revenue"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.status.in_(REVENUE_STATUSES))
            .group_by(OrderItem.product_id)
            .order_by(func.sum(OrderItem.line_total).desc())
            .limit(limit)
        )
        return [
            {"product_id": r.product_id, "product_name": r.name, "units_sold": int(r.units), "revenue": Decimal(r.revenue)}
            for r in self.db.execute(stmt).all()
        ]
