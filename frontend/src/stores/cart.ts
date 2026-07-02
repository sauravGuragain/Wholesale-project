import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CatalogItem } from "@/types/api";

export interface CartLine {
  product_id: string;
  name: string;
  sku: string;
  unit: string;
  price: string; // resolved price at time added
  quantity: number;
  max: number; // available stock
}

interface CartState {
  lines: CartLine[];
  add: (item: CatalogItem, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (item, qty = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.product_id === item.id);
          if (existing) {
            const nextQty = Math.min(existing.quantity + qty, item.quantity_available);
            return {
              lines: state.lines.map((l) =>
                l.product_id === item.id ? { ...l, quantity: nextQty } : l
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                product_id: item.id,
                name: item.name,
                sku: item.sku,
                unit: item.unit,
                price: item.price,
                quantity: Math.min(qty, item.quantity_available),
                max: item.quantity_available,
              },
            ],
          };
        }),
      setQty: (productId, qty) =>
        set((state) => ({
          lines: state.lines
            .map((l) =>
              l.product_id === productId ? { ...l, quantity: Math.max(0, Math.min(qty, l.max)) } : l
            )
            .filter((l) => l.quantity > 0),
        })),
      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.product_id !== productId) })),
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: () => get().lines.reduce((sum, l) => sum + Number(l.price) * l.quantity, 0),
    }),
    { name: "wc-cart" }
  )
);
