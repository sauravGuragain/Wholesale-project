/**
 * API contract types — kept in lockstep with the backend Pydantic schemas.
 * If a backend schema changes, mirror it here.
 */

export type Role = "admin" | "customer";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "static_qr";
export type PaymentStatus = "pending" | "verified" | "rejected";
export type DiscountType = "percent" | "flat";
export type OfferAppliesTo = "product" | "category" | "order";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: Role;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface MessageResponse {
  detail: string;
}

// --- Customers ---
export interface Customer {
  id: string;
  user_id: string;
  business_name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  price_group_id: string | null;
  credit_limit: string;
  outstanding_balance: string;
  is_active: boolean;
}

// --- Categories / Brands ---
export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
}
export interface Brand {
  id: string;
  name: string;
}

// --- Products ---
export interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: string;
  brand_id: string | null;
  unit: string;
  cost_price: string;
  selling_price: string;
  tax_rate: string;
  is_active: boolean;
  created_at: string;
  images: ProductImage[];
}
export interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  tax_rate: string;
  price: string;
  price_source: "customer_override" | "price_group" | "default";
  in_stock: boolean;
  quantity_available: number;
  images: ProductImage[];
}

// --- Inventory ---
export interface LowStockItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity_on_hand: number;
  reorder_threshold: number;
}

// --- Orders ---
export interface OrderItem {
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: string;
  quantity: number;
  line_total: string;
}
export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: string;
  tax_total: string;
  discount_total: string;
  grand_total: string;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  items: OrderItem[];
}

// --- Payments ---
export interface PaymentProof {
  id: string;
  url: string;
  created_at: string;
}
export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: string;
  status: PaymentStatus;
  verified_at: string | null;
  rejection_reason: string | null;
  proofs: PaymentProof[];
}

// --- Offers ---
export interface Offer {
  id: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: string;
  applies_to: OfferAppliesTo;
  target_id: string | null;
  min_order_value: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

// --- Reports ---
export interface BestSellingProduct {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: string;
}
export interface DashboardSummary {
  todays_orders: number;
  monthly_revenue: string;
  pending_orders: number;
  completed_orders: number;
  new_customers_this_month: number;
  low_stock_count: number;
  best_selling: BestSellingProduct[];
}

export interface SalesBucket {
  period: string;
  orders: number;
  revenue: string;
}
export interface SalesReport {
  from_date: string;
  to_date: string;
  group_by: string;
  total_orders: number;
  total_revenue: string;
  buckets: SalesBucket[];
}
export interface CustomerReportRow {
  customer_id: string;
  business_name: string;
  total_orders: number;
  total_spent: string;
}
export interface ProductReportRow {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: string;
}

// --- API error envelope ---
export interface ApiError {
  detail: string;
}
