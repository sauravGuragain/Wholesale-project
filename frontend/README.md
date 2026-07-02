# FMCG Ordering — Frontend

React 18 + TypeScript + Vite SPA for the wholesale ordering system.

## Stack
Vite · TypeScript (strict) · Tailwind (custom "operations console" tokens, full
light/dark) · React Router (lazy-loaded, role-gated routes) · TanStack Query ·
React Hook Form + Zod · Zustand · Sonner · lucide-react.

## Implemented — full application

**Customer**
- Login, session restore, role-based redirect
- Home dashboard, product catalog (search / category filter / add-to-cart /
  per-customer "your price")
- Cart (edit quantities), checkout (QR or COD, delivery address, notes)
- QR payment proof upload (drag-to-pick, preview, 5 MB / type validation)
- Order history + order detail with a live status stepper (polls for updates)
  and reorder

**Admin**
- Dashboard (6 KPI cards, best sellers, low stock)
- Products (CRUD, search, filters, modal form)
- Categories + brands (CRUD, slug display, delete guards)
- Inventory (per-product stock table, adjust with reason, reorder thresholds,
  low-stock highlighting)
- Offers (CRUD, discount types, validity, active toggle)
- Orders (list + status filter, detail with legal status transitions)
- Payments (verification queue, proof lightbox, verify / reject-with-reason)
- Customers (create login+profile, edit, disable/enable, reset password, search)
- Reports (sales trend chart, top customers, top products)
- Settings (business info, tax, payment-QR + logo upload)

**Cross-cutting**
- Reusable UI kit: DataTable (sort/empty/error/loading), Modal/ConfirmDialog,
  Button, Field/Input/Select, Card/Badge, Pagination, ThemeToggle, toasts
- Auth: in-memory access token, single-flight refresh on 401, httpOnly refresh cookie
- Route protection + role gating, error boundary, 404 page
- Responsive throughout; route-based code splitting

## Order lifecycle (fully integrated + tested)
Customer login → browse → add to cart → checkout → select QR/COD → upload proof
(QR) → place order → admin reviews → verify payment (auto-confirms) → status walk
(pending → confirmed → packed → out for delivery → delivered) → customer sees
live status. Reject-then-reupload and COD paths included.

## Run
```bash
npm install
cp .env.example .env       # empty VITE_API_BASE_URL uses the dev proxy
npm run dev                # http://localhost:5173 (proxies /api -> :8000)
```

## Verify
```bash
npm run typecheck          # clean
npm run build              # code-split production build
```
API integration verified against a live backend: the full ordering workflow
(25 checks) and all admin modules (23 checks) pass.
