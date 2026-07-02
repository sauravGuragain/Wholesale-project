import type { OrderStatus, PaymentStatus } from "@/types/api";

/**
 * Legal status transitions — mirrors the backend's ORDER_STATUS_TRANSITIONS.
 * The admin UI only offers moves that the backend will accept, so the two
 * never disagree.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** The happy-path sequence shown in the customer's tracking stepper. */
export const FULFILMENT_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_TONE: Record<
  OrderStatus,
  "neutral" | "primary" | "warning" | "success" | "danger" | "accent"
> = {
  pending: "warning",
  confirmed: "primary",
  packed: "accent",
  out_for_delivery: "primary",
  delivered: "success",
  cancelled: "danger",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Awaiting verification",
  verified: "Verified",
  rejected: "Rejected",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  verified: "success",
  rejected: "danger",
};
