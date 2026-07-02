from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.reports.schemas import (
    CustomerReportRow,
    DashboardSummary,
    ProductReportRow,
    SalesReport,
)
from app.modules.reports.service import ReportService
from app.shared.enums import RoleName

router = APIRouter(
    prefix=f"{settings.API_V1_PREFIX}/reports",
    tags=["reports"],
    dependencies=[Depends(require_role(RoleName.ADMIN))],
)


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(db: Session = Depends(get_db)) -> DashboardSummary:
    return DashboardSummary(**ReportService(db).dashboard())


@router.get("/sales", response_model=SalesReport)
def sales(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    group_by: str = Query(default="daily", pattern="^(daily|monthly|yearly)$"),
    db: Session = Depends(get_db),
) -> SalesReport:
    to_date = to_date or date.today()
    from_date = from_date or (to_date - timedelta(days=30))
    return SalesReport(**ReportService(db).sales(from_date=from_date, to_date=to_date, group_by=group_by))


@router.get("/customers", response_model=list[CustomerReportRow])
def customers(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)) -> list[CustomerReportRow]:
    return [CustomerReportRow(**r) for r in ReportService(db).customers(limit=limit)]


@router.get("/products", response_model=list[ProductReportRow])
def products(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)) -> list[ProductReportRow]:
    return [ProductReportRow(**r) for r in ReportService(db).products(limit=limit)]
