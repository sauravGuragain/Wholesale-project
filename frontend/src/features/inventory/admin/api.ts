import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { LowStockItem } from "@/types/api";

export interface InventoryRecord {
  product_id: string;
  quantity_on_hand: number;
  reorder_threshold: number;
}

export function useLowStock() {
  return useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => api.get<LowStockItem[]>("/api/v1/inventory/low-stock").then((r) => r.data),
  });
}

export function useInventory(productId: string | undefined) {
  return useQuery({
    queryKey: ["inventory", productId],
    queryFn: () => api.get<InventoryRecord>(`/api/v1/inventory/${productId}`).then((r) => r.data),
    enabled: Boolean(productId),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, delta, reason }: { productId: string; delta: number; reason: string }) =>
      api
        .post<InventoryRecord>(`/api/v1/inventory/${productId}/adjust`, { delta, reason })
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory", vars.productId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSetThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, reorder_threshold }: { productId: string; reorder_threshold: number }) =>
      api
        .put<InventoryRecord>(`/api/v1/inventory/${productId}/threshold`, { reorder_threshold })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
