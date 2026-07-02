import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ProductFormModal } from "./ProductFormModal";
import { useAdminProducts, useCategories, useDeleteProduct } from "../api";
import { apiErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";
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

export function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  useEffect(() => setPage(1), [debouncedSearch, category]);

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category_id: category || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, category, page]
  );

  const { data, isLoading, isError, refetch } = useAdminProducts(params);
  const categories = useCategories();
  const deleteMut = useDeleteProduct();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("Product deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete product"));
    }
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (p) => p.name.toLowerCase(),
      cell: (p) => (
        <div>
          <p className="font-medium text-content">{p.name}</p>
          <p className="text-xs text-muted">{p.sku}</p>
        </div>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      cell: (p) => <span className="text-muted">{p.unit}</span>,
    },
    {
      key: "selling_price",
      header: "Price",
      align: "right",
      sortValue: (p) => Number(p.selling_price),
      cell: (p) => <span className="font-medium">{formatCurrency(p.selling_price)}</span>,
    },
    {
      key: "tax",
      header: "Tax",
      align: "right",
      cell: (p) => <span className="text-muted">{p.tax_rate}%</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (p) =>
        p.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(p);
            }}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-primary"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(p);
            }}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="pl-9"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-52">
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(p) => p.id}
        loading={isLoading}
        error={isError ? "Couldn't load products." : null}
        onRetry={() => refetch()}
        onRowClick={openEdit}
        empty={{
          title: "No products yet",
          description: "Create your first product to start building the catalog.",
          action: (
            <Button onClick={openCreate} size="sm" className="mt-1">
              <Plus className="h-4 w-4" /> New product
            </Button>
          ),
        }}
      />

      {data && data.total > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} product={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete product"
        message={`"${deleting?.name}" will be hidden from the catalog. Past orders keep their record. Continue?`}
        confirmLabel="Delete"
        danger
        loading={deleteMut.isPending}
      />

      {/* Icon hint for empty deep-link state (kept for a11y landmark) */}
      <span className="sr-only">
        <Package /> Product management
      </span>
    </div>
  );
}
