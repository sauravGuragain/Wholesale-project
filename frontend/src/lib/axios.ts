import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { authStore } from "@/stores/auth";
import type { TokenResponse } from "@/types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true, // send/receive the refresh-token cookie
  headers: { "Content-Type": "application/json" },
});

// Attach the in-memory access token to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStore.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/*
  On a 401, attempt exactly one silent refresh, then replay the original
  request. Concurrent 401s share a single in-flight refresh promise so we don't
  fire N refreshes at once. A failed refresh clears the session.
*/
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<TokenResponse>(`${baseURL}/api/v1/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        authStore.setSession(res.data.access_token, res.data.role);
        return res.data.access_token;
      })
      .catch(() => {
        authStore.clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes("/auth/");

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

/** Extract a human-readable message from an axios error. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return detail;
    if (error.message) return error.message;
  }
  return fallback;
}
