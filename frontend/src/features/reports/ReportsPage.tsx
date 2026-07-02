import { useMemo, useState } from "react";
import { TrendingUp, Users, Package } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle, CenteredSpinner, ErrorState, EmptyState } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useSalesReport, useCustomerReport, useProductReport, type GroupBy } from "./api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { CustomerReportRow, ProductReportRow, SalesBucket } from "@/types/api";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("daily");
  const [range, setRange] = useState<"30" | "90" | "365">("30");

  const params = useMemo(
    () => ({ from_date: isoDaysAgo(Number(range)), to_date: isoDaysAgo(0), group_by: groupBy }),
    [range, groupBy]
  );

  const sales = useSalesReport(params);
  const customers = useCustomerReport();
  const products = useProductReport();

  const custCols: Column<CustomerReportRow>[] = [
    { key: "name", header: "Customer", cell: (r) => <span className="font-medium text-content">{r.business_name}</span> },
    { key: "orders", header: "Orders", align: "right", sortValue: (r) => r.total_orders, cell: (r) => formatNumber(r.total_orders) },
    {
      key: "spent",
      header: "Total spent",
      align: "right",
      sortValue: (r) => Number(r.total_spent),
      cell: (r) => <span className="font-medium">{formatCurrency(r.total_spent)}</span>,
    },
  ];

  const prodCols: Column<ProductReportRow>[] = [
    { key: "name", header: "Product", cell: (r) => <span className="font-medium text-content">{r.product_name}</span> },
    { key: "units", header: "Units", align: "right", sortValue: (r) => r.units_sold, cell: (r) => formatNumber(r.units_sold) },
    {
      key: "rev",
      header: "Revenue",
      align: "right",
      sortValue: (r) => Number(r.revenue),
      cell: (r) => <span className="font-medium">{formatCurrency(r.revenue)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sales trend */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Sales
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className="h-8 w-32">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </Select>
            <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="h-8 w-28">
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
        </CardHeader>
        <CardBody>
          {sales.isLoading ? (
            <CenteredSpinner />
          ) : sales.isError ? (
            <ErrorState message="Couldn't load sales data." onRetry={() => sales.refetch()} />
          ) : sales.data && sales.data.buckets.length > 0 ? (
            <>
              <div className="mb-6 flex flex-wrap gap-8">
                <div>
                  <p className="text-sm text-muted">Total revenue</p>
                  <p className="font-display text-2xl font-extrabold text-content">
                    {formatCurrency(sales.data.total_revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Total orders</p>
                  <p className="font-display text-2xl font-extrabold text-content">
                    {formatNumber(sales.data.total_orders)}
                  </p>
                </div>
              </div>
              <BarChart buckets={sales.data.buckets} />
            </>
          ) : (
            <EmptyState title="No sales in this range" description="Delivered orders will populate this chart." />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Top customers
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody className="p-3">
            <DataTable
              columns={custCols}
              rows={customers.data ?? []}
              rowKey={(r) => r.customer_id}
              loading={customers.isLoading}
              error={customers.isError ? "Couldn't load." : null}
              onRetry={() => customers.refetch()}
              empty={{ title: "No customer sales yet" }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" /> Top products
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody className="p-3">
            <DataTable
              columns={prodCols}
              rows={products.data ?? []}
              rowKey={(r) => r.product_id}
              loading={products.isLoading}
              error={products.isError ? "Couldn't load." : null}
              onRetry={() => products.refetch()}
              empty={{ title: "No product sales yet" }}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/** Lightweight CSS bar chart — no chart lib needed for this density. */
function BarChart({ buckets }: { buckets: SalesBucket[] }) {
  const max = Math.max(...buckets.map((b) => Number(b.revenue)), 1);
  return (
    <div className="flex h-48 items-end gap-1 overflow-x-auto">
      {buckets.map((b) => {
        const pct = (Number(b.revenue) / max) * 100;
        return (
          <div key={b.period} className="group flex min-w-[24px] flex-1 flex-col items-center gap-1">
            <div className="relative flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${b.period}: ${formatCurrency(b.revenue)} (${b.orders} orders)`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-muted">{b.period.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}
