import { Plus, Check, ImageOff } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Card";
import { formatCurrency, humanize } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";
import type { CatalogItem } from "@/types/api";

export function ProductCard({ item }: { item: CatalogItem }) {
  const add = useCartStore((s) => s.add);
  const inCart = useCartStore((s) => s.lines.some((l) => l.product_id === item.id));
  const [justAdded, setJustAdded] = useState(false);
  const primary = item.images.find((i) => i.is_primary) ?? item.images[0];

  const handleAdd = () => {
    add(item, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-shadow hover:shadow-pop">
      <div className="relative aspect-[4/3] bg-surface-2">
        {primary ? (
          <img src={primary.url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        {!item.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
            <Badge tone="danger">Out of stock</Badge>
          </div>
        )}
        {/* Show when a non-default price applies to this customer */}
        {item.price_source !== "default" && item.in_stock && (
          <span className="absolute left-2 top-2">
            <Badge tone="accent">Your price</Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted">{item.sku}</p>
        <h3 className="mt-0.5 line-clamp-2 font-medium text-content">{item.name}</h3>
        <p className="mt-1 text-xs text-muted">Per {humanize(item.unit)}</p>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="font-display text-lg font-extrabold text-content">{formatCurrency(item.price)}</p>
            {item.in_stock && (
              <p className="text-xs text-muted">{item.quantity_available} available</p>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!item.in_stock}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {justAdded ? "Added" : inCart ? "Add more" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="aspect-[4/3] animate-pulse bg-surface-2" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-6 w-20 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}
