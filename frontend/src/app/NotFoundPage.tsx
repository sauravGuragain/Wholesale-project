import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";

export function NotFoundPage() {
  const role = useAuthStore((s) => s.role);
  const home = role === "admin" ? "/admin" : role === "customer" ? "/shop" : "/login";
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Compass className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-extrabold text-content">Page not found</h2>
        <p className="mt-1 text-sm text-muted">The page you're looking for doesn't exist or has moved.</p>
      </div>
      <Link to={home}>
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
