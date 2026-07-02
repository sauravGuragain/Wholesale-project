import {
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle2,
  UserPlus,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboard, useLowStock } from "./api";
import { KpiCard, KpiCardSkeleton } from "./KpiCard";
import { Card, CardBody, CardHeader, CardTitle, Badge, ErrorState, EmptyState } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { BestSellingProduct, LowStockItem } from "@/types/api";

export function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const lowStock = useLowStock();

  const bestSellerCols: Column<BestSellingProduct>[] = [
    {
      key: "name",
      header: "Product",
      cell: (r) => <span className="font-medium text-content">{r.product_name}</span>,
    },
    {
      key: "units",
      header: "Units sold",
      align: "right",
      sortValue: (r) => r.units_sold,
      cell: (r) => formatNumber(r.units_sold),
    },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      sortValue: (r) => Number(r.revenue),
      cell: (r) => <span className="font-medium">{formatCurrency(r.revenue)}</span>,
    },
  ];

  const lowStockCols: Column<LowStockItem>[] = [
    {
      key: "name",
      header: "Product",
      cell: (r) => (
        <div>
          <p className="font-medium text-content">{r.product_name}</p>
          <p className="text-xs text-muted">{r.sku}</p>
        </div>
      ),
    },
    {
      key: "qty",
      header: "On hand",
      align: "right",
      sortValue: (r) => r.quantity_on_hand,
      cell: (r) => (
        <Badge tone={r.quantity_on_hand === 0 ? "danger" : "warning"}>{r.quantity_on_hand}</Badge>
      ),
    },
    {
      key: "threshold",
      header: "Reorder at",
      align: "right",
      cell: (r) => <span className="text-muted">{r.reorder_threshold}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}

        {isError && (
          <div className="sm:col-span-2 xl:col-span-3">
            <Card>
              <ErrorState message="Couldn't load dashboard metrics." onRetry={() => refetch()} />
            </Card>
          </div>
        )}

        {data && (
          <>
            <KpiCard label="Today's orders" value={formatNumber(data.todays_orders)} icon={ShoppingCart} tone="primary" />
            <KpiCard label="Revenue this month" value={formatCurrency(data.monthly_revenue)} icon={DollarSign} tone="accent" hint="Delivered orders only" />
            <KpiCard label="Pending orders" value={formatNumber(data.pending_orders)} icon={Clock} tone="warning" />
            <KpiCard label="Completed orders" value={formatNumber(data.completed_orders)} icon={CheckCircle2} tone="success" />
            <KpiCard label="New customers" value={formatNumber(data.new_customers_this_month)} icon={UserPlus} tone="primary" hint="This month" />
            <KpiCard label="Low-stock items" value={formatNumber(data.low_stock_count)} icon={AlertTriangle} tone="danger" />
          </>
        )}
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" /> Best sellers
              </span>
            </CardTitle>
            <Link to="/admin/reports" className="text-sm font-medium text-primary hover:underline">
              View reports
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {data && data.best_selling.length === 0 ? (
              <EmptyState title="No sales yet" description="Best-selling products appear once orders are delivered." />
            ) : (
              <div className="p-3">
                <DataTable
                  columns={bestSellerCols}
                  rows={data?.best_selling ?? []}
                  rowKey={(r) => r.product_id}
                  loading={isLoading}
                />
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Low stock
              </span>
            </CardTitle>
            <Link to="/admin/inventory" className="text-sm font-medium text-primary hover:underline">
              Manage inventory
            </Link>
          </CardHeader>
          <CardBody className="p-3">
            <DataTable
              columns={lowStockCols}
              rows={lowStock.data ?? []}
              rowKey={(r) => r.product_id}
              loading={lowStock.isLoading}
              error={lowStock.isError ? "Couldn't load low-stock items." : null}
              onRetry={() => lowStock.refetch()}
              empty={{ title: "All stocked up", description: "No products are below their reorder threshold." }}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
