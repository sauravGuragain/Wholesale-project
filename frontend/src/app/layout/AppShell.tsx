import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { adminNav, customerNav } from "./nav";
import { CartButton } from "@/features/orders/CartButton";

/** Derive a page title from the current path's matching nav item. */
function titleFor(pathname: string, fallback: string) {
  const all = [...adminNav, ...customerNav].flatMap((s) => s.items);
  const match = all
    .filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? fallback;
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-full">
      <Sidebar sections={adminNav} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={titleFor(pathname, "Dashboard")} onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function CustomerLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-full">
      <Sidebar sections={customerNav} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={titleFor(pathname, "Home")}
          onMenuClick={() => setMenuOpen(true)}
          actions={<CartButton />}
        />
        <main className="flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
