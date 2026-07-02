import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface Setting {
  key: string;
  value: Record<string, unknown>;
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: () =>
      api
        .get<Setting>(`/api/v1/settings/${key}`)
        .then((r) => r.data)
        .catch(() => ({ key, value: {} } as Setting)), // 404 => empty defaults
    retry: false,
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) =>
      api.put<Setting>(`/api/v1/settings/${key}`, { value }).then((r) => r.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["settings", vars.key] }),
  });
}

export function usePaymentQrUrl() {
  return useQuery({
    queryKey: ["settings", "payment-qr"],
    queryFn: () =>
      api.get<{ url: string | null }>("/api/v1/settings/images/payment-qr/url").then((r) => r.data),
  });
}

export function useUploadSettingImage(kind: "payment-qr" | "logo") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .put<{ key: string; url: string }>(`/api/v1/settings/images/${kind}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "payment-qr"] });
    },
  });
}
