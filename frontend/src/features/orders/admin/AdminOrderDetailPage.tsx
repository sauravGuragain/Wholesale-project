import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Package, ExternalLink } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  ErrorState,
  Badge,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { OrderStatusBadge, OrderStatusStepper } from "../OrderStatus";
import { ORDER_TRANSITIONS, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "../status";
import { useOrder, usePaymentForOrder, useUpdateOrderStatus } from "../api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/axios";
import type { OrderStatus } from "@/types/api";

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const order = useOrder(orderId);
  const payment = usePaymentForOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);

  const applyStatus = async () => {
    if (!orderId || !pendingStatus) return;
    try {
      await updateStatus.mutateAsync({ id: orderId, status: pendingStatus });
      toast.success(`Order marked ${ORDER_STATUS_LABEL[pendingStatus].toLowerCase()}`);
      setPendingStatus(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't update status"));
    }
  };

  if (order.isLoading) return <CenteredSpinner label="Loading order…" />;
  if (order.isError || !order.data)
    return <ErrorState message="Couldn't load this order." onRetry={() => order.refetch()} />;

  const o = order.data;
  const nextStatuses = ORDER_TRANSITIONS[o.status];

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-extrabold text-content">{o.order_number}</h2>
            <OrderStatusBadge status={o.status} />
          </div>
          <p className="text-sm text-muted">Placed {formatDateTime(o.created_at)}</p>
        </div>

        {/* Status transition controls — only legal next states are offered. */}
        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                variant={s === "cancelled" ? "outline" : "primary"}
                onClick={() => setPendingStatus(s)}
                loading={updateStatus.isPending && pendingStatus === s}
              >
                Mark {ORDER_STATUS_LABEL[s].toLowerCase()}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fulfilment</CardTitle>
        </CardHeader>
        <CardBody>
          <OrderStatusStepper status={o.status} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {o.items.map((item) => (
                <li key={item.product_id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-content">{item.product_name_snapshot}</p>
                    <p className="text-xs text-muted">
                      {item.sku_snapshot} · {formatCurrency(item.unit_price_snapshot)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium text-content">{formatCurrency(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-content">{formatCurrency(o.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Tax</span>
                <span className="text-content">{formatCurrency(o.tax_total)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-display text-base font-bold text-content">
                <span>Total</span>
                <span>{formatCurrency(o.grand_total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {payment.isLoading ? (
                <CenteredSpinner />
              ) : payment.data ? (
                <>
                  <div className="flex items-center justify-between">
                    <Badge tone="neutral">
                      {payment.data.method === "cod" ? "Cash on Delivery" : "QR Payment"}
                    </Badge>
                    <Badge tone={PAYMENT_STATUS_TONE[payment.data.status]}>
                      {PAYMENT_STATUS_LABEL[payment.data.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">
                    Amount due: <span className="font-medium text-content">{formatCurrency(payment.data.amount)}</span>
                  </p>
                  {payment.data.proofs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {payment.data.proofs.map((p) => (
                        <a
                          key={p.id}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block h-20 w-20 overflow-hidden rounded-lg border border-border"
                        >
                          <img src={p.url} alt="Proof" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {payment.data.method === "static_qr" && payment.data.status === "pending" && (
                    <Link
                      to="/admin/payments"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Verify in payments queue <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">No payment record.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-content">{o.delivery_address || "No address provided."}</p>
              {o.notes && <p className="mt-2 text-xs text-muted">Note: {o.notes}</p>}
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onClose={() => setPendingStatus(null)}
        onConfirm={applyStatus}
        title={pendingStatus ? `Mark ${ORDER_STATUS_LABEL[pendingStatus].toLowerCase()}?` : ""}
        message={
          pendingStatus === "cancelled"
            ? "Cancelling returns reserved stock to inventory. This can't be undone."
            : `The customer will see this order move to "${pendingStatus ? ORDER_STATUS_LABEL[pendingStatus] : ""}".`
        }
        confirmLabel="Confirm"
        danger={pendingStatus === "cancelled"}
        loading={updateStatus.isPending}
      />
    </div>
  );
}
