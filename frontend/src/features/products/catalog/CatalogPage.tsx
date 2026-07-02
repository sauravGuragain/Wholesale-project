import { useEffect, useMemo, useState } from "react";
import { Search, PackageSearch } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState, ErrorState } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/DataTable";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useCatalog, useCategories } from "../api";

const PAGE_SIZE = 12;

/** Debounce a rapidly-changing value (search box) to avoid a request per keystroke. */
function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  // Reset to page 1 whenever the filters change.
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

  const { data, isLoading, isError, refetch, isPlaceholderData } = useCatalog(params);
  const categories = useCategories();

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode…"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="sm:w-56"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <ErrorState message="Couldn't load the catalog." onRetry={() => refetch()} />
      ) : (
        <>
          <div
            className={`grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 ${
              isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            {isLoading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
              : data?.items.map((item) => <ProductCard key={item.id} item={item} />)}
          </div>

          {!isLoading && data && data.items.length === 0 && (
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" />}
              title="No products found"
              description="Try a different search term or clear the category filter."
            />
          )}

          {data && data.total > PAGE_SIZE && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
