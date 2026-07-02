import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Package } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle, CenteredSpinner, ErrorState, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OrderStatusStepper } from "../OrderStatus";
import { PaymentProofPanel } from "./PaymentProofPanel";
import { useOrder, usePaymentForOrder, useReorder } from "../api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/axios";

export function CustomerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const order = useOrder(orderId, { poll: true });
  const payment = usePaymentForOrder(orderId, { poll: true });
  const reorder = useReorder();

  const handleReorder = async () => {
    if (!orderId) return;
    try {
      const created = await reorder.mutateAsync(orderId);
      toast.success("Reordered — new order created");
      navigate(`/shop/orders/${created.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't reorder"));
    }
  };

  if (order.isLoading) return <CenteredSpinner label="Loading order…" />;
  if (order.isError || !order.data)
    return <ErrorState message="Couldn't load this order." onRetry={() => order.refetch()} />;

  const o = order.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/shop/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <Button variant="outline" onClick={handleReorder} loading={reorder.isPending}>
          <RefreshCw className="h-4 w-4" /> Reorder
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold text-content">{o.order_number}</h2>
          <p className="text-sm text-muted">Placed {formatDateTime(o.created_at)}</p>
        </div>
      </div>

      {/* Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Order status</CardTitle>
        </CardHeader>
        <CardBody>
          <OrderStatusStepper status={o.status} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
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
              <Row label="Subtotal" value={formatCurrency(o.subtotal)} />
              <Row label="Tax" value={formatCurrency(o.tax_total)} />
              {Number(o.discount_total) > 0 && <Row label="Discount" value={`- ${formatCurrency(o.discount_total)}`} />}
              <div className="flex justify-between border-t border-border pt-2 font-display text-base font-bold text-content">
                <span>Total</span>
                <span>{formatCurrency(o.grand_total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Payment + delivery */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardBody>
              {payment.isLoading ? (
                <CenteredSpinner />
              ) : payment.data ? (
                payment.data.method === "cod" ? (
                  <div className="space-y-2">
                    <Badge tone="neutral">Cash on Delivery</Badge>
                    <p className="text-sm text-muted">
                      Pay {formatCurrency(payment.data.amount)} in cash when your order is delivered.
                    </p>
                  </div>
                ) : (
                  <PaymentProofPanel orderId={o.id} payment={payment.data} />
                )
              ) : (
                <p className="text-sm text-muted">No payment record found.</p>
              )}
            </CardBody>
          </Card>

          {o.delivery_address && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-content">{o.delivery_address}</p>
                {o.notes && <p className="mt-2 text-xs text-muted">Note: {o.notes}</p>}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="text-content">{value}</span>
    </div>
  );
}
