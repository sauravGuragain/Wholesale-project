import { create } from "zustand";
import type { Role } from "@/types/api";

/**
 * Auth state.
 *
 * The access token lives in memory only (never localStorage) to limit XSS
 * blast radius; the refresh token is an httpOnly cookie the browser sends
 * automatically. On a hard reload the access token is gone, so the app tries a
 * silent /auth/refresh on boot to restore the session from the cookie.
 */
interface AuthState {
  accessToken: string | null;
  role: Role | null;
  /** null = unknown (still checking), false = definitely logged out, true = logged in */
  isAuthenticated: boolean | null;
  setSession: (token: string, role: Role) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  role: null,
  isAuthenticated: null,
  setSession: (accessToken, role) => set({ accessToken, role, isAuthenticated: true }),
  clearSession: () => set({ accessToken: null, role: null, isAuthenticated: false }),
}));

// Non-hook accessors for use inside the axios interceptor (outside React).
export const authStore = {
  get token() {
    return useAuthStore.getState().accessToken;
  },
  setSession: (token: string, role: Role) => useAuthStore.getState().setSession(token, role),
  clear: () => useAuthStore.getState().clearSession(),
};
