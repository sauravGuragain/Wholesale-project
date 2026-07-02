import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/cart";

export function CartButton() {
  const navigate = useNavigate();
  const count = useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));

  return (
    <button
      onClick={() => navigate("/shop/cart")}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-content"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingCart className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
