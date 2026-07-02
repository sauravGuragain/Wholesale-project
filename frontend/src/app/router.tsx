import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute, RoleRoute } from "@/features/auth/ProtectedRoute";
import { AdminLayout, CustomerLayout } from "@/app/layout/AppShell";
import { LazyBoundary } from "@/components/ui/Boundaries";
import { RootRedirect } from "./RootRedirect";
import { NotFoundPage } from "./NotFoundPage";

// Lazy-load feature pages so each route is its own chunk (keeps the initial
// bundle small; auth + layout stay eager for instant first paint).
const AdminDashboard = lazy(() => import("@/features/dashboard/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminProductsPage = lazy(() => import("@/features/products/admin/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage })));
const AdminCategoriesPage = lazy(() => import("@/features/categories/admin/AdminCategoriesPage").then((m) => ({ default: m.AdminCategoriesPage })));
const AdminInventoryPage = lazy(() => import("@/features/inventory/admin/AdminInventoryPage").then((m) => ({ default: m.AdminInventoryPage })));
const AdminOffersPage = lazy(() => import("@/features/offers/admin/AdminOffersPage").then((m) => ({ default: m.AdminOffersPage })));
const AdminOrdersPage = lazy(() => import("@/features/orders/admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })));
const AdminOrderDetailPage = lazy(() => import("@/features/orders/admin/AdminOrderDetailPage").then((m) => ({ default: m.AdminOrderDetailPage })));
const AdminPaymentsPage = lazy(() => import("@/features/payments/admin/AdminPaymentsPage").then((m) => ({ default: m.AdminPaymentsPage })));
const AdminCustomersPage = lazy(() => import("@/features/customers/admin/AdminCustomersPage").then((m) => ({ default: m.AdminCustomersPage })));
const ReportsPage = lazy(() => import("@/features/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const AdminSettingsPage = lazy(() => import("@/features/settings/admin/AdminSettingsPage").then((m) => ({ default: m.AdminSettingsPage })));

const CustomerDashboard = lazy(() => import("@/features/dashboard/customer/CustomerDashboard").then((m) => ({ default: m.CustomerDashboard })));
const CatalogPage = lazy(() => import("@/features/products/catalog/CatalogPage").then((m) => ({ default: m.CatalogPage })));
const CartPage = lazy(() => import("@/features/orders/customer/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("@/features/orders/customer/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const MyOrdersPage = lazy(() => import("@/features/orders/customer/MyOrdersPage").then((m) => ({ default: m.MyOrdersPage })));
const CustomerOrderDetailPage = lazy(() => import("@/features/orders/customer/CustomerOrderDetailPage").then((m) => ({ default: m.CustomerOrderDetailPage })));

const L = (el: React.ReactNode) => <LazyBoundary>{el}</LazyBoundary>;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <RootRedirect /> },

      // --- Admin ---
      {
        path: "/admin",
        element: <RoleRoute allow="admin" />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: L(<AdminDashboard />) },
              { path: "products", element: L(<AdminProductsPage />) },
              { path: "categories", element: L(<AdminCategoriesPage />) },
              { path: "inventory", element: L(<AdminInventoryPage />) },
              { path: "offers", element: L(<AdminOffersPage />) },
              { path: "orders", element: L(<AdminOrdersPage />) },
              { path: "orders/:orderId", element: L(<AdminOrderDetailPage />) },
              { path: "payments", element: L(<AdminPaymentsPage />) },
              { path: "customers", element: L(<AdminCustomersPage />) },
              { path: "reports", element: L(<ReportsPage />) },
              { path: "settings", element: L(<AdminSettingsPage />) },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },

      // --- Customer ---
      {
        path: "/shop",
        element: <RoleRoute allow="customer" />,
        children: [
          {
            element: <CustomerLayout />,
            children: [
              { index: true, element: L(<CustomerDashboard />) },
              { path: "catalog", element: L(<CatalogPage />) },
              { path: "cart", element: L(<CartPage />) },
              { path: "checkout", element: L(<CheckoutPage />) },
              { path: "orders", element: L(<MyOrdersPage />) },
              { path: "orders/:orderId", element: L(<CustomerOrderDetailPage />) },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
