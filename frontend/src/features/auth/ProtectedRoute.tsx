import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { CenteredSpinner } from "@/components/ui/Card";
import type { Role } from "@/types/api";

/**
 * Gate for authenticated routes. While the boot-time session restore is still
 * running (isAuthenticated === null), show a spinner rather than bouncing the
 * user to /login, which would drop a valid cookie-backed session on reload.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <CenteredSpinner label="Restoring your session…" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Gate for role-specific route trees. Sends a mismatched user to their home. */
export function RoleRoute({ allow }: { allow: Role }) {
  const role = useAuthStore((s) => s.role);
  if (role !== allow) {
    return <Navigate to={role === "admin" ? "/admin" : "/shop"} replace />;
  }
  return <Outlet />;
}
