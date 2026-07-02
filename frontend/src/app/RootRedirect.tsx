import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

/** Sends an authenticated user to their role's home. */
export function RootRedirect() {
  const role = useAuthStore((s) => s.role);
  return <Navigate to={role === "admin" ? "/admin" : "/shop"} replace />;
}
