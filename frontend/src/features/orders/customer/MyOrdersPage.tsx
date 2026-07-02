import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { OrderStatusBadge } from "../OrderStatus";
import { useOrders } from "../api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order } from "@/types/api";

const PAGE_SIZE = 15;

export function MyOrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useOrders({ page, page_size: PAGE_SIZE });

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
      cell: (o) => <span className="text-muted">{o.items.length}</span>,
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
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(o) => o.id}
        loading={isLoading}
        error={isError ? "Couldn't load your orders." : null}
        onRetry={() => refetch()}
        onRowClick={(o) => navigate(`/shop/orders/${o.id}`)}
        empty={{
          title: "No orders yet",
          description: "When you place an order, it'll show up here with live status.",
        }}
      />
      {data && data.total > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}
      <span className="sr-only">
        <ClipboardList /> Order history
      </span>
    </div>
  );
}
