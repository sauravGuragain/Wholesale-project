import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { DashboardSummary, LowStockItem } from "@/types/api";

async function fetchDashboard(): Promise<DashboardSummary> {
  const res = await api.get<DashboardSummary>("/api/v1/reports/dashboard");
  return res.data;
}

async function fetchLowStock(): Promise<LowStockItem[]> {
  const res = await api.get<LowStockItem[]>("/api/v1/inventory/low-stock");
  return res.data;
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
}

export function useLowStock() {
  return useQuery({ queryKey: ["inventory", "low-stock"], queryFn: fetchLowStock });
}
