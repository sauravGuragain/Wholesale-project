import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { OmLogo } from "@/components/ui/OmLogo";
import { cn } from "@/lib/utils";
import type { NavSection } from "./nav";

interface SidebarProps {
  sections: NavSection[];
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ sections, open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={onClose} aria-hidden />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <OmLogo className="h-5 w-5" />
            </div>
            <span className="font-display text-base font-extrabold text-content">Wholesale</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface-2 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {section.heading}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary-soft text-primary"
                            : "text-muted hover:bg-surface-2 hover:text-content"
                        )
                      }
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
