import { useState, useRef, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuthStore } from "@/stores/auth";
import { logout } from "@/features/auth/api";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
  actions?: ReactNode;
}

export function Topbar({ title, onMenuClick, actions }: TopbarProps) {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="font-display text-lg font-bold text-content">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {actions}
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm hover:bg-surface-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-primary">
              <UserIcon className="h-3.5 w-3.5" />
            </span>
            <span className="hidden capitalize text-content sm:inline">{role}</span>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-pop animate-slide-up">
              <button
                onClick={handleLogout}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-sm text-content hover:bg-surface-2"
                )}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
