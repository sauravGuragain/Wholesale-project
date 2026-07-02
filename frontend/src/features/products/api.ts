import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Brand, CatalogItem, Category, Paginated, Product } from "@/types/api";

// --- Catalog (customer) ---
export interface CatalogParams {
  search?: string;
  category_id?: string;
  page: number;
  page_size: number;
}

async function fetchCatalog(params: CatalogParams): Promise<Paginated<CatalogItem>> {
  const res = await api.get<Paginated<CatalogItem>>("/api/v1/products", { params });
  return res.data;
}

export function useCatalog(params: CatalogParams) {
  return useQuery({
    queryKey: ["catalog", params],
    queryFn: () => fetchCatalog(params),
    placeholderData: (prev) => prev, // keep previous page visible while fetching next
  });
}

// --- Admin products ---
export interface AdminProductParams {
  search?: string;
  category_id?: string;
  brand_id?: string;
  page: number;
  page_size: number;
}

async function fetchAdminProducts(params: AdminProductParams): Promise<Paginated<Product>> {
  const res = await api.get<Paginated<Product>>("/api/v1/products/admin", { params });
  return res.data;
}

export function useAdminProducts(params: AdminProductParams) {
  return useQuery({
    queryKey: ["admin-products", params],
    queryFn: () => fetchAdminProducts(params),
    placeholderData: (prev) => prev,
  });
}

export interface ProductPayload {
  name: string;
  sku: string;
  barcode?: string | null;
  category_id: string;
  brand_id?: string | null;
  unit: string;
  cost_price: string;
  selling_price: string;
  tax_rate: string;
  is_active: boolean;
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductPayload) => api.post<Product>("/api/v1/products", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProductPayload> }) =>
      api.patch<Product>(`/api/v1/products/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
}

// --- Categories & brands (shared) ---
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/api/v1/categories").then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get<Brand[]>("/api/v1/brands").then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}
