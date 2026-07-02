import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  ShoppingCart,
  Users,
  BadgePercent,
  BarChart3,
  Settings,
  Store,
  ClipboardList,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

export const adminNav: NavSection[] = [
  {
    items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true }],
  },
  {
    heading: "Catalog",
    items: [
      { label: "Products", to: "/admin/products", icon: Package },
      { label: "Categories", to: "/admin/categories", icon: Tags },
      { label: "Inventory", to: "/admin/inventory", icon: Warehouse },
      { label: "Offers", to: "/admin/offers", icon: BadgePercent },
    ],
  },
  {
    heading: "Sales",
    items: [
      { label: "Orders", to: "/admin/orders", icon: ShoppingCart },
      { label: "Payments", to: "/admin/payments", icon: Wallet },
      { label: "Customers", to: "/admin/customers", icon: Users },
    ],
  },
  {
    heading: "Insights",
    items: [
      { label: "Reports", to: "/admin/reports", icon: BarChart3 },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

export const customerNav: NavSection[] = [
  {
    items: [
      { label: "Home", to: "/shop", icon: LayoutDashboard, end: true },
      { label: "Catalog", to: "/shop/catalog", icon: Store },
      { label: "My Orders", to: "/shop/orders", icon: ClipboardList },
    ],
  },
];
