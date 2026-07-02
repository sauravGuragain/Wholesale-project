import { Check, Clock, Package, Truck, PackageCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/api";
import {
  FULFILMENT_STEPS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "./status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

const STEP_ICON: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  confirmed: Check,
  packed: Package,
  out_for_delivery: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

/** Horizontal (desktop) / vertical (mobile) progress tracker for an order. */
export function OrderStatusStepper({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3">
        <XCircle className="h-5 w-5 text-danger" />
        <div>
          <p className="font-medium text-danger">Order cancelled</p>
          <p className="text-xs text-muted">This order is no longer being processed.</p>
        </div>
      </div>
    );
  }

  const currentIndex = FULFILMENT_STEPS.indexOf(status);

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {FULFILMENT_STEPS.map((step, i) => {
        const Icon = STEP_ICON[step];
        const done = i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === FULFILMENT_STEPS.length - 1;

        return (
          <li key={step} className="flex flex-1 gap-3 sm:flex-col sm:items-center sm:gap-2">
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              {/* connector left (desktop) */}
              <span
                className={cn(
                  "hidden h-0.5 flex-1 sm:block",
                  i === 0 ? "opacity-0" : done || active ? "bg-primary" : "bg-border"
                )}
              />
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-primary bg-primary text-primary-fg",
                  active && "border-primary bg-primary-soft text-primary",
                  !done && !active && "border-border bg-surface text-muted"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              {/* connector right (desktop) */}
              <span
                className={cn(
                  "hidden h-0.5 flex-1 sm:block",
                  isLast ? "opacity-0" : done ? "bg-primary" : "bg-border"
                )}
              />
              {/* connector (mobile, vertical) */}
              {!isLast && (
                <span className={cn("my-1 h-6 w-0.5 sm:hidden", done ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <div className="pb-4 sm:pb-0 sm:text-center">
              <p
                className={cn(
                  "text-sm font-medium",
                  active ? "text-content" : done ? "text-content" : "text-muted"
                )}
              >
                {ORDER_STATUS_LABEL[step]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
