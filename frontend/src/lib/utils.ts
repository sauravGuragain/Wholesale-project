import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with correct override semantics. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a numeric/string amount as currency. Wholesaler default: NPR-style, adjustable. */
export function formatCurrency(value: number | string, currency = "Rs") {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return `${currency} 0.00`;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isNaN(n) ? "0" : n.toLocaleString();
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Title-case an enum-ish token: "out_for_delivery" -> "Out For Delivery". */
export function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
