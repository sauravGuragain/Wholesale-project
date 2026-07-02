import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { Card, CardBody, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/stores/cart";
import { formatCurrency, humanize } from "@/lib/utils";

export function CartPage() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const subtotal = lines.reduce((sum, l) => sum + Number(l.price) * l.quantity, 0);

  if (lines.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Your cart is empty"
          description="Browse the catalog and add products to get started."
          action={
            <Button className="mt-1" onClick={() => navigate("/shop/catalog")}>
              Browse catalog
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Line items */}
      <div className="space-y-3 lg:col-span-2">
        {lines.map((line) => (
          <Card key={line.product_id}>
            <CardBody className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-content">{line.name}</p>
                <p className="text-xs text-muted">
                  {line.sku} · {formatCurrency(line.price)} / {humanize(line.unit)}
                </p>
              </div>

              <div className="flex items-center rounded-lg border border-border">
                <button
                  onClick={() => setQty(line.product_id, line.quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center text-muted hover:bg-surface-2"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={line.quantity}
                  min={1}
                  max={line.max}
                  onChange={(e) => setQty(line.product_id, Number(e.target.value) || 1)}
                  className="h-8 w-12 border-x border-border bg-transparent text-center text-sm focus:outline-none"
                  aria-label="Quantity"
                />
                <button
                  onClick={() => setQty(line.product_id, line.quantity + 1)}
                  disabled={line.quantity >= line.max}
                  className="flex h-8 w-8 items-center justify-center text-muted hover:bg-surface-2 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="w-24 text-right font-medium text-content">
                {formatCurrency(Number(line.price) * line.quantity)}
              </div>

              <button
                onClick={() => remove(line.product_id)}
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardBody>
          </Card>
        ))}
        <div className="flex justify-between px-1">
          <button onClick={clear} className="text-sm text-muted hover:text-danger">
            Clear cart
          </button>
          <Link to="/shop/catalog" className="text-sm font-medium text-primary hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div>
        <Card className="sticky top-20">
          <CardBody className="space-y-4">
            <h3 className="font-display font-bold text-content">Order summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium text-content">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-muted">
              Tax is calculated at checkout based on each product's rate.
            </p>
            <Button size="lg" className="w-full" onClick={() => navigate("/shop/checkout")}>
              Proceed to checkout <ArrowRight className="h-4 w-4" />
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
