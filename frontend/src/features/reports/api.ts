import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { CustomerReportRow, ProductReportRow, SalesReport } from "@/types/api";

export type GroupBy = "daily" | "monthly" | "yearly";

export function useSalesReport(params: { from_date?: string; to_date?: string; group_by: GroupBy }) {
  return useQuery({
    queryKey: ["reports", "sales", params],
    queryFn: () => api.get<SalesReport>("/api/v1/reports/sales", { params }).then((r) => r.data),
  });
}

export function useCustomerReport() {
  return useQuery({
    queryKey: ["reports", "customers"],
    queryFn: () => api.get<CustomerReportRow[]>("/api/v1/reports/customers").then((r) => r.data),
  });
}

export function useProductReport() {
  return useQuery({
    queryKey: ["reports", "products"],
    queryFn: () => api.get<ProductReportRow[]>("/api/v1/reports/products").then((r) => r.data),
  });
}
