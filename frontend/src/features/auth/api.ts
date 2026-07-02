import { api } from "@/lib/axios";
import { authStore } from "@/stores/auth";
import type { TokenResponse } from "@/types/api";

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/api/v1/auth/login", { username, password });
  authStore.setSession(res.data.access_token, res.data.role);
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/v1/auth/logout");
  } finally {
    authStore.clear();
  }
}

/** Silent session restore on app boot using the httpOnly refresh cookie. */
export async function restoreSession(): Promise<boolean> {
  try {
    const res = await api.post<TokenResponse>("/api/v1/auth/refresh");
    authStore.setSession(res.data.access_token, res.data.role);
    return true;
  } catch {
    authStore.clear();
    return false;
  }
}
