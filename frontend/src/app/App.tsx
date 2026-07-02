import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { router } from "./router";
import { restoreSession } from "@/features/auth/api";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { ErrorBoundary } from "@/components/ui/Boundaries";

export function App() {
  const theme = useThemeStore((s) => s.theme);
  const setAuthChecked = useState(false)[1];

  // Attempt a silent session restore once on boot. Until it resolves,
  // isAuthenticated stays null and ProtectedRoute shows a spinner.
  useEffect(() => {
    let mounted = true;
    (async () => {
      await restoreSession();
      if (mounted) setAuthChecked(true);
    })();
    return () => {
      mounted = false;
    };
  }, [setAuthChecked]);

  // Ensure the store transitions out of the null (checking) state even if the
  // network call above never resolves for some reason.
  useEffect(() => {
    const t = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated === null) {
        useAuthStore.getState().clearSession();
      }
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        richColors
        theme={theme}
        toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }}
      />
    </QueryClientProvider>
  );
}
