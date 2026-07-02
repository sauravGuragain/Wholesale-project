import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select } from "@/components/ui/Input";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { OrderStatusBadge } from "../OrderStatus";
import { ORDER_STATUS_LABEL } from "../status";
import { useOrders } from "../api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/api";

const PAGE_SIZE = 20;
const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");

  // The list endpoint returns all statuses; we filter client-side within the page.
  // (A server-side status filter is a natural enhancement; kept simple for now.)
  const { data, isLoading, isError, refetch } = useOrders({ page, page_size: PAGE_SIZE });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return statusFilter ? items.filter((o) => o.status === statusFilter) : items;
  }, [data, statusFilter]);

  const columns: Column<Order>[] = [
    {
      key: "order_number",
      header: "Order",
      cell: (o) => <span className="font-medium text-content">{o.order_number}</span>,
    },
    {
      key: "created_at",
      header: "Placed",
      sortValue: (o) => o.created_at,
      cell: (o) => <span className="text-muted">{formatDateTime(o.created_at)}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "center",
      cell: (o) => o.items.length,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortValue: (o) => Number(o.grand_total),
      cell: (o) => <span className="font-medium">{formatCurrency(o.grand_total)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
          className="w-52"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        loading={isLoading}
        error={isError ? "Couldn't load orders." : null}
        onRetry={() => refetch()}
        onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
        empty={{ title: "No orders", description: "Orders placed by customers will appear here." }}
      />

      {data && data.total > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
