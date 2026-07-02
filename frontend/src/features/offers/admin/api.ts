import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { DiscountType, Offer, OfferAppliesTo } from "@/types/api";

export interface OfferPayload {
  name: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: string;
  applies_to: OfferAppliesTo;
  target_id?: string | null;
  min_order_value?: string | null;
  is_active: boolean;
}

export function useOffers(activeOnly = false) {
  return useQuery({
    queryKey: ["offers", activeOnly],
    queryFn: () =>
      api.get<Offer[]>("/api/v1/offers", { params: { active_only: activeOnly } }).then((r) => r.data),
  });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OfferPayload) => api.post<Offer>("/api/v1/offers", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<OfferPayload> }) =>
      api.patch<Offer>(`/api/v1/offers/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/offers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}
