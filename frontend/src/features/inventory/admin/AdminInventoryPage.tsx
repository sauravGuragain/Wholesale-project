import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Boxes, Plus, Minus, AlertTriangle } from "lucide-react";
import { Card, CardBody, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { useAdminProducts } from "@/features/products/api";
import { useAdjustStock, useSetThreshold } from "./api";
import { api } from "@/lib/axios";
import { apiErrorMessage } from "@/lib/axios";
import { useQueries } from "@tanstack/react-query";
import type { Product } from "@/types/api";

const PAGE_SIZE = 15;

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

interface Row extends Product {
  quantity_on_hand: number;
  reorder_threshold: number;
}

export function AdminInventoryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  useEffect(() => setPage(1), [debounced]);

  const { data, isLoading, isError, refetch } = useAdminProducts({
    search: debounced || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  // Fetch inventory per product on the current page (batched via useQueries).
  const products = data?.items ?? [];
  const invQueries = useQueries({
    queries: products.map((p) => ({
      queryKey: ["inventory", p.id],
      queryFn: () =>
        api.get<{ quantity_on_hand: number; reorder_threshold: number }>(`/api/v1/inventory/${p.id}`).then((r) => r.data),
      staleTime: 15_000,
    })),
  });

  const rows: Row[] = useMemo(
    () =>
      products.map((p, i) => ({
        ...p,
        quantity_on_hand: invQueries[i]?.data?.quantity_on_hand ?? 0,
        reorder_threshold: invQueries[i]?.data?.reorder_threshold ?? 0,
      })),
    [products, invQueries]
  );

  const [adjusting, setAdjusting] = useState<Row | null>(null);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <div>
          <p className="font-medium text-content">{r.name}</p>
          <p className="text-xs text-muted">{r.sku}</p>
        </div>
      ),
    },
    {
      key: "onhand",
      header: "On hand",
      align: "right",
      sortValue: (r) => r.quantity_on_hand,
      cell: (r) => {
        const low = r.quantity_on_hand <= r.reorder_threshold;
        return (
          <span className="inline-flex items-center gap-1.5">
            {low && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
            <Badge tone={r.quantity_on_hand === 0 ? "danger" : low ? "warning" : "neutral"}>
              {r.quantity_on_hand}
            </Badge>
          </span>
        );
      },
    },
    { key: "threshold", header: "Reorder at", align: "right", cell: (r) => <span className="text-muted">{r.reorder_threshold}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setAdjusting(r); }}>
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-9" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={isError ? "Couldn't load inventory." : null}
        onRetry={() => refetch()}
        empty={{ title: "No products", description: "Add products to manage their stock." }}
      />

      {data && data.total > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}

      {adjusting && <AdjustModal row={adjusting} onClose={() => setAdjusting(null)} />}

      <span className="sr-only"><Boxes /> Inventory</span>
    </div>
  );
}

function AdjustModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [threshold, setThreshold] = useState(row.reorder_threshold);
  const adjust = useAdjustStock();
  const setThresh = useSetThreshold();

  const save = async () => {
    try {
      if (delta !== 0) {
        if (!reason.trim()) {
          toast.error("Please give a reason for the stock change.");
          return;
        }
        await adjust.mutateAsync({ productId: row.id, delta, reason: reason.trim() });
      }
      if (threshold !== row.reorder_threshold) {
        await setThresh.mutateAsync({ productId: row.id, reorder_threshold: threshold });
      }
      toast.success("Inventory updated");
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't update inventory"));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust inventory"
      description={row.name}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={adjust.isPending || setThresh.isPending}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardBody className="flex items-center justify-between">
            <span className="text-sm text-muted">Current on hand</span>
            <span className="font-display text-xl font-extrabold text-content">{row.quantity_on_hand}</span>
          </CardBody>
        </Card>

        <Field label="Stock change" hint="Positive adds stock, negative removes it.">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDelta((d) => d - 1)}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value) || 0)}
              className="text-center"
            />
            <Button variant="outline" size="icon" onClick={() => setDelta((d) => d + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Field>
        {delta !== 0 && (
          <>
            <p className="text-sm text-muted">
              New total: <span className="font-medium text-content">{row.quantity_on_hand + delta}</span>
            </p>
            <Field label="Reason" required>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Restock delivery, damaged goods" />
            </Field>
          </>
        )}
        <Field label="Reorder threshold" hint="Low-stock alerts fire at or below this level.">
          <Input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value) || 0)} />
        </Field>
      </div>
    </Modal>
  );
}
