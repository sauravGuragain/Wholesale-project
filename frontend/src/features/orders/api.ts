import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Order, Paginated, Payment, OrderStatus, PaymentMethod } from "@/types/api";

// ---------------- Orders ----------------

export interface PlaceOrderPayload {
  items: { product_id: string; quantity: number }[];
  payment_method: PaymentMethod;
  delivery_address?: string | null;
  notes?: string | null;
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) =>
      api.post<Order>("/api/v1/orders", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["catalog"] }); // stock changed
    },
  });
}

export interface OrdersParams {
  page: number;
  page_size: number;
}

export function useOrders(params: OrdersParams) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => api.get<Paginated<Order>>("/api/v1/orders", { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(orderId: string | undefined, opts?: { poll?: boolean }) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.get<Order>(`/api/v1/orders/${orderId}`).then((r) => r.data),
    enabled: Boolean(orderId),
    // Light polling gives the customer near-real-time status without websockets.
    refetchInterval: opts?.poll ? 15_000 : false,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<Order>(`/api/v1/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceOrderId: string) =>
      api.post<Order>(`/api/v1/orders/${sourceOrderId}/reorder`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

// ---------------- Payments ----------------

export function usePaymentForOrder(orderId: string | undefined, opts?: { poll?: boolean }) {
  return useQuery({
    queryKey: ["payment", "order", orderId],
    queryFn: () => api.get<Payment>(`/api/v1/payments/order/${orderId}`).then((r) => r.data),
    enabled: Boolean(orderId),
    refetchInterval: opts?.poll ? 15_000 : false,
  });
}

export function useUploadProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, file }: { orderId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<Payment>(`/api/v1/payments/${orderId}/proof`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: ["payment", "order", payment.order_id] });
    },
  });
}

export function usePendingPayments() {
  return useQuery({
    queryKey: ["payments", "pending"],
    queryFn: () => api.get<Payment[]>("/api/v1/payments/pending").then((r) => r.data),
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.patch<Payment>(`/api/v1/payments/${paymentId}/verify`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", "pending"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      api.patch<Payment>(`/api/v1/payments/${paymentId}/reject`, { reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments", "pending"] }),
  });
}

export function usePaymentQr() {
  return useQuery({
    queryKey: ["settings", "payment-qr"],
    queryFn: () =>
      api.get<{ url: string | null }>("/api/v1/settings/images/payment-qr/url").then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}
