import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Customer, Paginated } from "@/types/api";

export interface CustomerCreatePayload {
  username: string;
  password: string;
  business_name: string;
  contact_person?: string | null;
  phone?: string | null;
  address?: string | null;
  credit_limit?: string;
}

export interface CustomerUpdatePayload {
  business_name?: string;
  contact_person?: string | null;
  phone?: string | null;
  address?: string | null;
  credit_limit?: string;
  is_active?: boolean;
}

export function useCustomers(params: { search?: string; page: number; page_size: number }) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => api.get<Paginated<Customer>>("/api/v1/customers", { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CustomerCreatePayload) =>
      api.post<Customer>("/api/v1/customers", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerUpdatePayload }) =>
      api.patch<Customer>(`/api/v1/customers/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useResetCustomerPassword() {
  return useMutation({
    mutationFn: ({ id, new_password }: { id: string; new_password: string }) =>
      api.post(`/api/v1/customers/${id}/reset-password`, { new_password }),
  });
}
